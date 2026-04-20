from __future__ import annotations

import os
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from app.config import settings
from app.core.exceptions import AppError

_NONCE_SIZE = 12
_KEY_SIZE = 32  # AES-256


class EncryptionError(AppError):
    def __init__(self, message: str = "Error de cifrado") -> None:
        super().__init__(message, status_code=500)


def _read_master_key() -> bytes:
    """
    Reads master key from Kubernetes secret file (32 bytes minimum).
    Falls back to a dev constant — never use in production.
    """
    path = settings.master_key_secret_file
    if os.path.exists(path):
        raw = Path(path).read_bytes().strip()
        if len(raw) < _KEY_SIZE:
            raise EncryptionError("Clave maestra insuficiente (mínimo 32 bytes)")
        return raw[:_KEY_SIZE]
    return b"dev-insecure-master-key-32bytes!!"  # noqa: S105


def derive_dataset_key(context_id: str) -> bytes:
    """
    HKDF-SHA256 derived from master_key + context_id as info label.
    The derived key is NEVER persisted in DB or Redis (CA-ENC-03).
    Returns 32 bytes (AES-256 key).
    """
    master = _read_master_key()
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=_KEY_SIZE,
        salt=None,
        info=context_id.encode(),
    )
    return hkdf.derive(master)


def encrypt_sensitive_value(plaintext: str, context_id: str) -> bytes:
    """
    AES-256-GCM encryption with a random 12-byte nonce.
    Returns nonce (12 bytes) + ciphertext concatenated (CA-ENC-01).
    """
    key = derive_dataset_key(context_id)
    nonce = os.urandom(_NONCE_SIZE)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return nonce + ciphertext


def decrypt_sensitive_value(ciphertext: bytes, context_id: str) -> str:
    """
    Splits nonce (12 bytes) + ciphertext and decrypts with AES-256-GCM.
    Logs without exposing detail; raises EncryptionError on any failure (CA-ENC-02).
    """
    if len(ciphertext) <= _NONCE_SIZE:
        raise EncryptionError("Dato cifrado inválido")
    try:
        key = derive_dataset_key(context_id)
        nonce = ciphertext[:_NONCE_SIZE]
        data = ciphertext[_NONCE_SIZE:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, data, None).decode()
    except EncryptionError:
        raise
    except Exception:
        raise EncryptionError()
