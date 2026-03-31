# test_auth.py
# Criterios cubiertos: CA-MAGIC-02, CA-MAGIC-03, CA-STATE-02
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md


class TestAuthIntegration:
    async def test_should_return_410_on_second_magic_link_use(self) -> None:
        # CA-MAGIC-02
        raise NotImplementedError

    async def test_should_return_410_on_expired_magic_link(self) -> None:
        # CA-MAGIC-03
        raise NotImplementedError
