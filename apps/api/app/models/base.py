from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base declarativa de todos os models.

    SQLAlchemy puro — sem Flask-SQLAlchemy. Isso mantém os models utilizáveis
    fora de um request (seed, scripts, testes) e é o que o Alembic importa para
    montar o `target_metadata`.
    """
