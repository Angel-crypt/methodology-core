from __future__ import annotations

# repository.py
# Módulo: operational_registry
# Responsabilidad: persistencia de sujetos, aplicaciones y valores
# Criterios de aceptación relacionados: CA-CONTRACT-01
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 12


class OperationalRegistryRepository:
    async def get_subject_by_id(self) -> None:
        raise NotImplementedError
