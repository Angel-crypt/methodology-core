from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.application import Application
from app.db.models.metric_value import MetricValue
from app.db.models.subject import Subject
from app.db.models.subject_context import SubjectContext


class OperationalRegistryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_subject(self, project_id: uuid.UUID | None, created_by: uuid.UUID) -> Subject:
        subject = Subject(project_id=project_id, created_by=created_by)
        self.db.add(subject)
        await self.db.flush()
        return subject

    async def get_subject(self, subject_id: uuid.UUID) -> Subject | None:
        return (await self.db.execute(
            select(Subject).where(Subject.id == subject_id)
        )).scalar_one_or_none()

    async def count_subjects_by_applicator(self, applicator_id: uuid.UUID) -> int:
        return int((await self.db.execute(
            select(func.count()).select_from(Subject).where(Subject.created_by == applicator_id)
        )).scalar_one())

    async def get_context(self, subject_id: uuid.UUID) -> SubjectContext | None:
        return (await self.db.execute(
            select(SubjectContext).where(SubjectContext.subject_id == subject_id)
        )).scalar_one_or_none()

    async def create_context(self, subject_id: uuid.UUID, **kwargs: object) -> SubjectContext:
        ctx = SubjectContext(subject_id=subject_id, **kwargs)
        self.db.add(ctx)
        await self.db.flush()
        return ctx

    async def create_application(self, **kwargs: object) -> Application:
        application = Application(**kwargs)
        self.db.add(application)
        await self.db.flush()
        return application

    async def list_applications_by_applicator(self, applicator_id: uuid.UUID) -> list[Application]:
        return list((await self.db.execute(
            select(Application)
            .where(Application.applicator_id == applicator_id)
            .order_by(Application.created_at.desc())
        )).scalars().all())

    async def save_metric_values(
        self, application_id: uuid.UUID, values: list[dict]
    ) -> list[MetricValue]:
        saved = []
        for v in values:
            mv = MetricValue(application_id=application_id, **v)
            self.db.add(mv)
            saved.append(mv)
        await self.db.flush()
        return saved
