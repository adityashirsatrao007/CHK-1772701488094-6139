import base64
import io
import json
import logging
import os
import tempfile
import urllib.parse
import urllib.request
from typing import Any, Optional

import cv2
import numpy as np
from PIL import Image, ImageChops

logger = logging.getLogger(__name__)

DEFAULT_HF_IMAGE_MODEL_ID = os.getenv(
    "HF_IMAGE_DEEPFAKE_MODEL_ID",
    "dima806/deepfake_vs_real_image_detection",
)
DEFAULT_HF_IMAGE_THRESHOLD = float(os.getenv("HF_IMAGE_DEEPFAKE_THRESHOLD", "0.35"))
DEFAULT_VIDEO_FRAME_LIMIT = int(os.getenv("DEEPFAKE_VIDEO_FRAME_LIMIT", "6"))
ROBOFLOW_API_URL = os.getenv("ROBOFLOW_API_URL", "https://detect.roboflow.com")

_image_classifier = None
_image_classifier_model_id = None

_MANIPULATED_LABEL_KEYWORDS = (
    "fake",
    "deepfake",
    "synthetic",
    "manipulated",
    "edited",
    "forged",
    "ai generated",
    "ai-generated",
)
_AUTHENTIC_LABEL_KEYWORDS = ("real", "authentic", "genuine", "original", "unaltered")
_ROBOFLOW_SUSPICIOUS_LABEL_KEYWORDS = (
    "fake",
    "deepfake",
    "manip",
    "splice",
    "swap",
    "tamper",
    "edit",
    "forg",
)


def analyze_uploaded_evidence(file_bytes: bytes, file_name: str, content_type: str) -> dict[str, Any]:
    media_type = _resolve_media_type(file_name, content_type)

    if media_type == "image":
        return _analyze_image_evidence(file_bytes)

    if media_type == "video":
        return _analyze_video_evidence(file_bytes)

    if media_type == "audio":
        return {
            "status": "success",
            "evidence_type": "Audio Evidence",
            "confidence_score": 0.0,
            "is_manipulated": False,
            "explanation": "Audio spoof analysis is not enabled yet. The backend is now wired for pretrained Hugging Face image deepfake detection and optional Roboflow evidence models.",
            "key_factors": [
                "No audio deepfake model configured",
                "Image and video evidence analysis is enabled via Hugging Face",
                "Roboflow enrichment can be enabled with ROBOFLOW_API_KEY and ROBOFLOW_MODEL_ID",
            ],
        }

    return {
        "status": "error",
        "evidence_type": content_type or "unknown",
        "confidence_score": 0.0,
        "is_manipulated": False,
        "explanation": "Unsupported evidence type. Upload an image or video file for deepfake analysis.",
        "key_factors": ["Supported evidence types: image, video"],
    }


def _resolve_media_type(file_name: str, content_type: str) -> str:
    lowered_name = (file_name or "").lower()
    lowered_type = (content_type or "").lower()

    if lowered_type.startswith("image/") or lowered_name.endswith((".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tiff")):
        return "image"
    if lowered_type.startswith("video/") or lowered_name.endswith((".mp4", ".avi", ".mov", ".mkv", ".webm")):
        return "video"
    if lowered_type.startswith("audio/") or lowered_name.endswith((".wav", ".mp3", ".m4a", ".flac", ".aac", ".ogg")):
        return "audio"
    return "unknown"


def _get_image_classifier():
    global _image_classifier, _image_classifier_model_id

    model_id = os.getenv("HF_IMAGE_DEEPFAKE_MODEL_ID", DEFAULT_HF_IMAGE_MODEL_ID)
    if _image_classifier is not None and _image_classifier_model_id == model_id:
        return _image_classifier, model_id

    from transformers import pipeline

    logger.info("Loading Hugging Face deepfake classifier: %s", model_id)
    _image_classifier = pipeline("image-classification", model=model_id)
    _image_classifier_model_id = model_id
    return _image_classifier, model_id


def _open_image(image_bytes: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image


def _normalize_label(label: str) -> str:
    return label.lower().replace("_", " ").replace("-", " ").strip()


def _is_manipulated_label(label: str) -> bool:
    normalized = _normalize_label(label)
    return any(keyword in normalized for keyword in _MANIPULATED_LABEL_KEYWORDS)


def _is_authentic_label(label: str) -> bool:
    normalized = _normalize_label(label)
    return any(keyword in normalized for keyword in _AUTHENTIC_LABEL_KEYWORDS)


def _summarize_predictions(predictions: list[dict[str, Any]]) -> str:
    return ", ".join(
        f"{prediction['label']} ({float(prediction['score']) * 100:.1f}%)"
        for prediction in predictions[:3]
    )


def _extract_probabilities(predictions: list[dict[str, Any]]) -> tuple[float, float]:
    fake_score = 0.0
    real_score = 0.0

    for prediction in predictions:
        label = str(prediction.get("label", ""))
        score = float(prediction.get("score", 0.0))
        if _is_manipulated_label(label):
            fake_score = max(fake_score, score)
        elif _is_authentic_label(label):
            real_score = max(real_score, score)

    if fake_score == 0.0 and real_score > 0.0:
        fake_score = max(0.0, 1.0 - real_score)
    if real_score == 0.0 and fake_score > 0.0:
        real_score = max(0.0, 1.0 - fake_score)

    return fake_score, real_score


def _run_hugging_face_image_model(image: Image.Image) -> dict[str, Any]:
    classifier, model_id = _get_image_classifier()
    predictions = classifier(image, top_k=5)
    fake_score, real_score = _extract_probabilities(predictions)
    return {
        "model_id": model_id,
        "predictions": predictions,
        "fake_score": fake_score,
        "real_score": real_score,
    }


def _ela_fallback_score(image: Image.Image) -> float:
    rgb_image = image.convert("RGB")
    buffer = io.BytesIO()
    rgb_image.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")
    diff = ImageChops.difference(rgb_image, recompressed)
    diff_array = np.asarray(diff, dtype=np.float32)
    if diff_array.size == 0:
        return 0.0
    return float(min(0.99, (diff_array.mean() / 255.0) * 6.0))


def _get_roboflow_model_id() -> Optional[str]:
    model_id = os.getenv("ROBOFLOW_MODEL_ID")
    if model_id:
        return model_id.strip().strip("/")
    project_id = os.getenv("ROBOFLOW_PROJECT_ID")
    version = os.getenv("ROBOFLOW_VERSION")
    if project_id and version:
        return f"{project_id.strip().strip('/')}/{version.strip().strip('/')}"
    return None


def _run_roboflow_inference(image_bytes: bytes) -> Optional[dict[str, Any]]:
    api_key = os.getenv("ROBOFLOW_API_KEY")
    model_id = _get_roboflow_model_id()
    if not api_key or not model_id:
        return None

    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    endpoint = f"{ROBOFLOW_API_URL.rstrip('/')}/{model_id}?api_key={urllib.parse.quote(api_key)}"
    request = urllib.request.Request(
        endpoint,
        data=encoded_image.encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    predictions = payload.get("predictions", [])
    suspicious_predictions = []
    highest_confidence = 0.0

    for prediction in predictions:
        label = str(prediction.get("class", ""))
        confidence = float(prediction.get("confidence", 0.0))
        highest_confidence = max(highest_confidence, confidence)
        normalized = _normalize_label(label)
        if any(keyword in normalized for keyword in _ROBOFLOW_SUSPICIOUS_LABEL_KEYWORDS):
            suspicious_predictions.append(f"{label} ({confidence * 100:.1f}%)")

    return {
        "model_id": model_id,
        "prediction_count": len(predictions),
        "highest_confidence": highest_confidence,
        "suspicious_predictions": suspicious_predictions,
    }


def _build_image_result(
    fake_score: float,
    real_score: float,
    key_factors: list[str],
    explanation_prefix: str,
) -> dict[str, Any]:
    threshold = float(os.getenv("HF_IMAGE_DEEPFAKE_THRESHOLD", str(DEFAULT_HF_IMAGE_THRESHOLD)))
    is_manipulated = fake_score >= threshold
    verdict_confidence = fake_score if is_manipulated else max(real_score, 1.0 - fake_score)
    explanation = (
        f"{explanation_prefix} "
        f"Manipulation probability: {fake_score * 100:.1f}%. "
        f"Decision threshold: {threshold * 100:.1f}%."
    )

    return {
        "status": "success",
        "evidence_type": "Image Evidence",
        "confidence_score": round(verdict_confidence * 100, 2),
        "is_manipulated": is_manipulated,
        "explanation": explanation,
        "key_factors": key_factors,
    }


def _analyze_image_evidence(image_bytes: bytes) -> dict[str, Any]:
    image = _open_image(image_bytes)
    key_factors = [f"Image resolution: {image.width}x{image.height}"]

    hugging_face_result = None
    model_error = None
    try:
        hugging_face_result = _run_hugging_face_image_model(image)
        key_factors.extend(
            [
                f"Hugging Face model: {hugging_face_result['model_id']}",
                f"Top labels: {_summarize_predictions(hugging_face_result['predictions'])}",
            ]
        )
    except Exception as exc:
        model_error = str(exc)
        logger.exception("Hugging Face deepfake inference failed")

    roboflow_result = None
    try:
        roboflow_result = _run_roboflow_inference(image_bytes)
    except Exception:
        logger.exception("Roboflow evidence enrichment failed")

    if roboflow_result:
        key_factors.append(f"Roboflow model: {roboflow_result['model_id']}")
        if roboflow_result["suspicious_predictions"]:
            key_factors.append(
                "Roboflow suspicious detections: "
                + ", ".join(roboflow_result["suspicious_predictions"])
            )
        else:
            key_factors.append(
                f"Roboflow detections returned: {roboflow_result['prediction_count']} regions"
            )

    if hugging_face_result:
        fake_score = hugging_face_result["fake_score"]
        real_score = hugging_face_result["real_score"]
        if roboflow_result and roboflow_result["suspicious_predictions"]:
            fake_score = max(fake_score, roboflow_result["highest_confidence"])
            real_score = min(real_score, 1.0 - roboflow_result["highest_confidence"])

        return _build_image_result(
            fake_score=fake_score,
            real_score=real_score,
            key_factors=key_factors,
            explanation_prefix="Pretrained deepfake analysis completed using a Hugging Face image classifier.",
        )

    heuristic_score = _ela_fallback_score(image)
    key_factors.append(f"Fallback ELA anomaly score: {heuristic_score * 100:.1f}%")
    if model_error:
        key_factors.append(f"Hugging Face model unavailable: {model_error}")

    return _build_image_result(
        fake_score=heuristic_score,
        real_score=1.0 - heuristic_score,
        key_factors=key_factors,
        explanation_prefix="Hugging Face inference was unavailable, so the backend used a deterministic error-level analysis fallback.",
    )


def _sample_video_frames(video_bytes: bytes) -> tuple[list[Image.Image], list[float]]:
    suffix = os.getenv("DEEPFAKE_VIDEO_SUFFIX", ".mp4")
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(video_bytes)
        temp_path = temp_file.name

    capture = cv2.VideoCapture(temp_path)
    try:
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        sample_count = min(DEFAULT_VIDEO_FRAME_LIMIT, frame_count) if frame_count else DEFAULT_VIDEO_FRAME_LIMIT
        frame_indexes = np.linspace(0, max(frame_count - 1, 0), num=max(sample_count, 1), dtype=int)

        frames: list[Image.Image] = []
        timestamps: list[float] = []
        for frame_index in frame_indexes:
            capture.set(cv2.CAP_PROP_POS_FRAMES, int(frame_index))
            success, frame = capture.read()
            if not success:
                continue
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(Image.fromarray(rgb_frame))
            timestamps.append((frame_index / fps) if fps > 0 else 0.0)

        return frames, timestamps
    finally:
        capture.release()
        try:
            os.remove(temp_path)
        except OSError:
            logger.warning("Failed to remove temporary video file: %s", temp_path)


def _analyze_video_evidence(video_bytes: bytes) -> dict[str, Any]:
    frames, timestamps = _sample_video_frames(video_bytes)
    if not frames:
        return {
            "status": "error",
            "evidence_type": "Video Evidence",
            "confidence_score": 0.0,
            "is_manipulated": False,
            "explanation": "The video could not be decoded into frames for deepfake analysis.",
            "key_factors": ["Frame extraction failed"],
        }

    frame_fake_scores: list[float] = []
    flagged_timestamps: list[str] = []
    model_id = None

    try:
        classifier, model_id = _get_image_classifier()
        threshold = float(os.getenv("HF_IMAGE_DEEPFAKE_THRESHOLD", str(DEFAULT_HF_IMAGE_THRESHOLD)))

        for frame, timestamp in zip(frames, timestamps):
            predictions = classifier(frame, top_k=5)
            fake_score, _ = _extract_probabilities(predictions)
            frame_fake_scores.append(fake_score)
            if fake_score >= threshold:
                flagged_timestamps.append(f"{timestamp:.2f}s ({fake_score * 100:.1f}%)")

        average_fake_score = sum(frame_fake_scores) / len(frame_fake_scores)
        max_fake_score = max(frame_fake_scores)
        threshold = float(os.getenv("HF_IMAGE_DEEPFAKE_THRESHOLD", str(DEFAULT_HF_IMAGE_THRESHOLD)))
        is_manipulated = average_fake_score >= threshold or max_fake_score >= (threshold + 0.15)
        verdict_confidence = average_fake_score if is_manipulated else 1.0 - average_fake_score

        key_factors = [
            f"Sampled frames: {len(frames)}",
            f"Hugging Face model: {model_id}",
            f"Average manipulation probability across frames: {average_fake_score * 100:.1f}%",
            f"Peak frame manipulation probability: {max_fake_score * 100:.1f}%",
        ]
        if flagged_timestamps:
            key_factors.append("Flagged timestamps: " + ", ".join(flagged_timestamps[:5]))

        explanation = (
            "Video deepfake screening completed by sampling representative frames and running the Hugging Face image classifier on each frame. "
            f"Average manipulation probability: {average_fake_score * 100:.1f}%."
        )

        return {
            "status": "success",
            "evidence_type": "Video Evidence",
            "confidence_score": round(verdict_confidence * 100, 2),
            "is_manipulated": is_manipulated,
            "explanation": explanation,
            "key_factors": key_factors,
        }
    except Exception as exc:
        logger.exception("Video deepfake inference failed")
        return {
            "status": "error",
            "evidence_type": "Video Evidence",
            "confidence_score": 0.0,
            "is_manipulated": False,
            "explanation": "Video deepfake analysis failed while loading or running the Hugging Face model.",
            "key_factors": [str(exc), f"Sampled frames: {len(frames)}", f"Model: {model_id or DEFAULT_HF_IMAGE_MODEL_ID}"],
        }