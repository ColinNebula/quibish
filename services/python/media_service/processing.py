"""Image sanitising: validates real image content, strips metadata, bounds dimensions."""
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 50_000_000
ALLOWED = {"JPEG", "PNG", "WEBP", "GIF"}
Image.MAX_IMAGE_PIXELS = MAX_PIXELS


class MediaError(ValueError):
    pass


@dataclass
class ImageReport:
    format: str
    width: int
    height: int
    had_exif: bool
    had_gps: bool


def _open(data: bytes) -> Image.Image:
    if len(data) > MAX_BYTES:
        raise MediaError("file too large")
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as e:
        raise MediaError("not a valid image") from e
    if img.format not in ALLOWED:
        raise MediaError(f"unsupported format {img.format}")
    return img


def inspect(data: bytes) -> ImageReport:
    img = _open(data)
    exif = img.getexif()
    return ImageReport(img.format, img.width, img.height, bool(exif), bool(exif.get_ifd(0x8825)) if exif else False)


def optimize(data: bytes, max_side: int = 1920, quality: int = 85, fmt: str = "webp") -> tuple[bytes, str, ImageReport]:
    img = _open(data)
    report = inspect(data)
    img = ImageOps.exif_transpose(img)  # honour rotation before the metadata is dropped
    return _encode(img, max_side, quality, fmt), f"image/{fmt}", report


def thumbnail(data: bytes, size: int = 320, fmt: str = "webp") -> tuple[bytes, str]:
    img = ImageOps.exif_transpose(_open(data))
    img = ImageOps.fit(img.convert("RGBA" if fmt != "jpeg" else "RGB"), (size, size))
    return _encode(img, size, 80, fmt), f"image/{fmt}"


def _encode(img: Image.Image, max_side: int, quality: int, fmt: str) -> bytes:
    if fmt not in ("webp", "jpeg", "png"):
        raise MediaError("unsupported output format")
    img = img.copy()
    img.thumbnail((max_side, max_side))
    if fmt == "jpeg" and img.mode != "RGB":
        img = img.convert("RGB")
    elif img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGBA")
    out = io.BytesIO()
    kwargs = {} if fmt == "png" else {"quality": quality}
    img.save(out, format=fmt.upper(), **kwargs)  # no exif= argument: metadata is not carried over
    return out.getvalue()