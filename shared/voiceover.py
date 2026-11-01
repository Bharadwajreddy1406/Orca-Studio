"""Reusable and configurable speech services for narrated Manim scenes."""

import importlib
import importlib.util
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any

from edge_tts import Communicate
from manim_voiceover._typing import VoiceoverData
from manim_voiceover.helper import remove_bookmarks
from manim_voiceover.services.base import PathLike, SpeechService, path_to_string
from pydub import AudioSegment
from pydub.silence import detect_leading_silence

from shared.machine import kokoro_python_path

TRIMMED_TAIL_MS = 120
DEFAULT_KOKORO_VOICE = "af_heart"
# Language letter (a American, b British, ...), gender letter, then a name.
KOKORO_VOICE_PATTERN = re.compile(r"^[abefhijpz][fm]_[a-z]+$")
KOKORO_SYNTHESIZER = Path(__file__).with_name("kokoro_synthesize.py")


class EdgeTtsSpeechService(SpeechService):
    """Generate narration with Microsoft Edge's online neural voices."""

    def __init__(
        self,
        voice: str = "en-IN-NeerjaNeural",
        rate: str = "+0%",
        volume: str = "+0%",
        pitch: str = "+0Hz",
        trim_trailing_silence: bool = False,
        **kwargs: object,
    ) -> None:
        super().__init__(**kwargs)
        self.voice = voice
        self.rate = rate
        self.volume = volume
        self.pitch = pitch
        self.trim_trailing_silence = trim_trailing_silence

    def generate_from_text(
        self,
        text: str,
        cache_dir: PathLike | None = None,
        path: PathLike | None = None,
        **kwargs: object,
    ) -> VoiceoverData:
        cache_dir = self.cache_dir if cache_dir is None else cache_dir
        input_text = remove_bookmarks(text)
        input_data = {
            "input_text": input_text,
            "service": "edge-tts",
            "voice": self.voice,
            "rate": self.rate,
            "volume": self.volume,
            "pitch": self.pitch,
        }
        if self.trim_trailing_silence:
            input_data["trim_trailing_silence"] = True

        cached_result = self.get_cached_result(input_data, cache_dir)
        if cached_result is not None:
            return cached_result

        if path is None:
            audio_path = self.get_audio_basename(input_data) + ".mp3"
        else:
            audio_path = str(Path(path_to_string(path)).with_suffix(".mp3"))

        output_path = (Path(cache_dir) / audio_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        Communicate(
            input_text,
            voice=self.voice,
            rate=self.rate,
            volume=self.volume,
            pitch=self.pitch,
        ).save_sync(str(output_path))
        if self.trim_trailing_silence:
            self.trim_tail(output_path)

        return {
            "input_text": input_text,
            "input_data": input_data,
            "original_audio": audio_path,
        }

    @staticmethod
    def trim_tail(audio_path: Path) -> None:
        """Cut the padding Edge TTS appends, which tracker durations would include."""
        audio = AudioSegment.from_file(audio_path)
        silent_tail_ms = detect_leading_silence(audio.reverse(), silence_threshold=-45)
        kept_ms = len(audio) - max(0, silent_tail_ms - TRIMMED_TAIL_MS)
        audio[:kept_ms].export(audio_path, format="mp3")


def kokoro_python() -> Path:
    """Locate the Python of the separate Kokoro environment."""
    python = kokoro_python_path()
    if not python.is_file():
        raise RuntimeError(
            f"Kokoro's Python was not found at {python}. Run `orca setup`, or install Kokoro in its own "
            "environment, or point ORCA_KOKORO_PYTHON at that environment's python."
        )
    return python


class KokoroSpeechService(SpeechService):
    """Generate narration locally with Kokoro, so no text leaves the computer.

    Kokoro runs in its own environment, one short process per narration block.
    """

    def __init__(
        self,
        voice: str = DEFAULT_KOKORO_VOICE,
        speed: float = 1.0,
        **kwargs: object,
    ) -> None:
        super().__init__(**kwargs)
        if not KOKORO_VOICE_PATTERN.match(voice):
            raise ValueError(
                f"{voice!r} is not a Kokoro voice name such as 'af_heart' or "
                "'bm_lewis'. See shared/voices/voices.json."
            )
        if speed <= 0:
            raise ValueError("Kokoro speed must be greater than zero.")
        self.voice = voice
        self.speed = speed

    def generate_from_text(
        self,
        text: str,
        cache_dir: PathLike | None = None,
        path: PathLike | None = None,
        **kwargs: object,
    ) -> VoiceoverData:
        cache_dir = self.cache_dir if cache_dir is None else cache_dir
        input_text = remove_bookmarks(text)
        input_data = {
            "input_text": input_text,
            "service": "kokoro",
            "voice": self.voice,
            "speed": self.speed,
        }

        cached_result = self.get_cached_result(input_data, cache_dir)
        if cached_result is not None:
            return cached_result

        if path is None:
            audio_path = self.get_audio_basename(input_data) + ".wav"
        else:
            audio_path = str(Path(path_to_string(path)).with_suffix(".wav"))

        output_path = (Path(cache_dir) / audio_path).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        result = subprocess.run(
            [
                str(kokoro_python()),
                str(KOKORO_SYNTHESIZER),
                self.voice,
                str(self.speed),
                str(output_path),
            ],
            input=input_text.encode("utf-8"),
            capture_output=True,
            check=False,
        )
        if result.returncode or not output_path.is_file():
            detail = result.stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(
                f"Kokoro failed for voice {self.voice!r}:\n{detail[-800:]}"
            )

        return {
            "input_text": input_text,
            "input_data": input_data,
            "original_audio": audio_path,
        }


EXTERNAL_SERVICES = {
    "gtts": ("manim_voiceover.services.gtts", "GTTSService", "lang", "gtts"),
    "azure": (
        "manim_voiceover.services.azure",
        "AzureService",
        "voice",
        "azure.cognitiveservices.speech",
    ),
    "elevenlabs": (
        "manim_voiceover.services.elevenlabs",
        "ElevenLabsService",
        "voice_name",
        "elevenlabs",
    ),
    "openai": (
        "manim_voiceover.services.openai",
        "OpenAIService",
        "voice",
        "openai",
    ),
}


def load_voiceover_config(config_path: Path | None) -> dict[str, Any]:
    if config_path is None or not config_path.is_file():
        return {}
    # Full-line // comments hold the table of allowed services and voices.
    lines = config_path.read_text(encoding="utf-8").splitlines()
    config = json.loads(
        "\n".join(line for line in lines if not line.lstrip().startswith("//"))
    )
    if not isinstance(config, dict):
        raise TypeError(f"Voiceover config must contain a JSON object: {config_path}")
    return config


def create_speech_service(config_path: Path | None = None) -> SpeechService:
    """Create the configured local Kokoro, Edge TTS, or external speech service."""
    config = load_voiceover_config(config_path)
    configured_service = str(config.get("service", "edge-tts")).casefold()
    service_name = os.getenv("ORCA_VOICE_SERVICE", configured_service).casefold()
    configured_voice = config.get("voice")
    configured_options = config.get("options", {})
    if not isinstance(configured_options, dict):
        raise TypeError("voiceover.json 'options' must be a JSON object")
    voice = configured_voice if isinstance(configured_voice, str) else ""
    options = dict(configured_options)
    # The configured voice and options belong to the configured service, so a
    # one-render override to a different service must not inherit them.
    if service_name.replace("edge-tts", "edge") != configured_service.replace(
        "edge-tts", "edge"
    ):
        voice, options = "", {}
    voice = os.getenv("ORCA_VOICE", voice)

    if service_name == "kokoro":
        return KokoroSpeechService(voice=voice or DEFAULT_KOKORO_VOICE, **options)

    if service_name in {"edge-tts", "edge"}:
        return EdgeTtsSpeechService(
            voice=voice or "en-IN-NeerjaNeural",
            **options,
        )

    try:
        module_name, class_name, voice_option, requirement = EXTERNAL_SERVICES[
            service_name
        ]
    except KeyError as error:
        supported = ", ".join(["kokoro", "edge-tts", *EXTERNAL_SERVICES])
        raise ValueError(
            f"Unknown voice service {service_name!r}. Supported: {supported}"
        ) from error

    if voice:
        options[voice_option] = voice
    try:
        if importlib.util.find_spec(requirement) is None:
            raise ImportError(requirement)
        module = importlib.import_module(module_name)
        service_class = getattr(module, class_name)
        return service_class(**options)
    except ImportError as error:
        raise RuntimeError(
            f"The {service_name!r} voice provider is not installed. Run "
            f'`uv add "manim-voiceover[{service_name}]"`.'
        ) from error
