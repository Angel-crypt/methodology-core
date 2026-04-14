from __future__ import annotations

# encryption.py
# Módulo: core
# Responsabilidad: cifrado AES y derivación HKDF por contexto
# Criterios de aceptación relacionados: CA-ENC-01, CA-ENC-03
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 7


def derive_dataset_key() -> bytes:
    raise NotImplementedError


def encrypt_sensitive_value() -> bytes:
    raise NotImplementedError


def decrypt_sensitive_value() -> str:
    raise NotImplementedError
