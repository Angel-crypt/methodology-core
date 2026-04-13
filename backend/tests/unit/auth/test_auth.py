# test_auth.py
# Criterios cubiertos: CA-MAGIC-01, CA-STATE-01, CA-AUDIT-02
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md


class TestAuthModule:
    async def test_should_activate_user_when_magic_link_is_valid(self) -> None:
        # CA-MAGIC-01
        raise NotImplementedError

    async def test_should_return_403_when_user_disabled(self) -> None:
        # CA-STATE-01
        raise NotImplementedError
