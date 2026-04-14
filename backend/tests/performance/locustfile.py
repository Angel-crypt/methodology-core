from __future__ import annotations

from locust import HttpUser, task


class AuthenticatedUser(HttpUser):
    @task
    def run_authenticated_flow(self) -> None:
        raise NotImplementedError


class AdminFlow(HttpUser):
    @task
    def run_admin_flow(self) -> None:
        raise NotImplementedError


class PermissionCheck(HttpUser):
    @task
    def run_permission_check(self) -> None:
        raise NotImplementedError


class PermissionCheckCacheMiss(HttpUser):
    @task
    def run_permission_check_cache_miss(self) -> None:
        raise NotImplementedError


class ConcurrentDataAccess(HttpUser):
    @task
    def run_concurrent_data_access(self) -> None:
        raise NotImplementedError
