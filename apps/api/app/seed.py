"""Carga inicial do catálogo.

Fica fora das migrations de propósito. Uma migration que insere dados usando o
model da aplicação passa a quebrar assim que o model evolui — e uma que insere
com SQL literal vira uma segunda definição do schema, que envelhece em silêncio.
Seed é dado, não estrutura.

Idempotente: se já existe produto, não faz nada. Roda a cada boot sem estragar
o catálogo de um ambiente em uso.

    python -m app.seed
"""

from __future__ import annotations

import logging
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Product

logger = logging.getLogger(__name__)

PRODUCTS: list[dict[str, object]] = [
    {
        "name": "Webcam Ultra HD 4K MX Brio",
        "price": Decimal("1299.00"),
        "short_description": "Imagem Ultra HD 4K com HDR e foco automático",
        "description": (
            "A Logitech MX Brio é uma webcam de alta performance, ideal para streamers "
            "que buscam qualidade excepcional em vídeo. Com resolução 4K Ultra HD e "
            "tecnologia HDR, oferece imagens nítidas e cores vibrantes. Possui autofoco "
            "avançado e campo de visão ajustável, além de microfones estéreo embutidos, "
            "proporcionando áudio claro e sem ruídos. A MX Brio ainda conta com suporte "
            "para Windows Hello e Logitech Capture, facilitando o ajuste de configurações "
            "para streaming."
        ),
        "image": "product-1.jpg",
    },
    {
        "name": "Elgato Stream Deck",
        "price": Decimal("1199.00"),
        "short_description": "Controle suas streams com 15 teclas personalizáveis",
        "description": (
            "O Elgato Stream Deck é uma ferramenta essencial para criadores de conteúdo "
            "que desejam uma experiência de streaming dinâmica e profissional. Com 15 "
            "teclas LCD personalizáveis, o Stream Deck permite controle total das ações "
            "no streaming, facilitando comandos para transições, inserção de sons, "
            "mensagens no chat e muito mais. Ele é compatível com OBS, Twitch, YouTube e "
            "outras plataformas, tornando cada transmissão mais prática e interativa."
        ),
        "image": "product-2.jpg",
    },
    {
        "name": "Galaxy Book4",
        "price": Decimal("4199.00"),
        "short_description": "Notebook leve e potente com integração Samsung",
        "description": (
            "O Galaxy Book4 é o notebook ideal para streamers e criadores que priorizam "
            "mobilidade e desempenho. Com processadores de última geração e integração "
            "total com o ecossistema Samsung, ele facilita a troca de arquivos e permite "
            "o espelhamento de tela com dispositivos Galaxy. A tela Full HD e a bateria "
            "de longa duração tornam o Galaxy Book4 perfeito para transmissões ao vivo e "
            "edições de vídeo."
        ),
        "image": "product-3.jpg",
    },
    {
        "name": "Notebook Dell XPS 13",
        "price": Decimal("8999.00"),
        "short_description": "Notebook compacto com tela infinita 4K e desempenho premium",
        "description": (
            "O Dell XPS 13 é um dos notebooks mais recomendados para streamers e "
            "criadores de conteúdo devido ao seu desempenho de ponta e design premium. "
            "Com uma tela infinita de alta resolução 4K, ele oferece uma experiência "
            "visual imersiva, perfeita para edições e transmissões. Equipado com "
            "processadores Intel Core i7 e armazenamento SSD, o XPS 13 combina velocidade "
            "e eficiência, ideal para multitarefa."
        ),
        "image": "product-4.jpg",
    },
    {
        "name": "JBL Tune 720BT",
        "price": Decimal("349.00"),
        "short_description": "Fone Bluetooth leve com graves intensos e longa bateria",
        "description": (
            "O JBL Tune 720BT é um fone de ouvido Bluetooth acessível e confortável, "
            "perfeito para quem busca boa qualidade de som com graves impactantes. Com "
            "até 50 horas de reprodução contínua, ele é ideal para sessões prolongadas de "
            "streaming ou edição de vídeos. Leve e fácil de ajustar, proporciona boa "
            "vedação contra ruídos externos."
        ),
        "image": "product-5.jpg",
    },
    {
        "name": "Smartphone Samsung Galaxy S22",
        "price": Decimal("4499.00"),
        "short_description": "Smartphone com câmera avançada e gravação em 8K",
        "description": (
            "O Samsung Galaxy S22 é um dos smartphones mais avançados para criação de "
            "conteúdo móvel. Equipado com uma câmera principal de alta resolução e "
            "gravação em 8K, ele captura imagens e vídeos em qualidade profissional. "
            "Ideal para vloggers e streamers que gostam de transmitir de qualquer lugar."
        ),
        "image": "product-6.jpg",
    },
    {
        "name": "Câmera EOS Rebel SL3",
        "price": Decimal("3999.00"),
        "short_description": "DSLR compacta com 24.1 MP e gravação em 4K",
        "description": (
            "A Canon EOS Rebel SL3 é uma câmera DSLR leve e compacta, ideal para "
            "streamers e vloggers que buscam alta qualidade de imagem sem comprometer a "
            "portabilidade. Com sensor de 24.1 MP e capacidade de gravação em 4K, oferece "
            "captura de detalhes impressionantes e cores vibrantes."
        ),
        "image": "product-7.jpg",
    },
    {
        "name": "Microfone Hollyland Lark M2 Duo",
        "price": Decimal("1399.00"),
        "short_description": "Microfone de lapela duplo com áudio cristalino e transmissão sem fio",
        "description": (
            "O Hollyland Lark M2 Duo é um microfone de lapela sem fio que oferece áudio "
            "de qualidade para streamers e criadores de conteúdo. Com dois transmissores "
            "e um receptor, ele permite captação de áudio para entrevistas e transmissões "
            "em dupla, mantendo clareza e baixo ruído."
        ),
        "image": "product-8.jpg",
    },
    {
        "name": "Microfone Condensador Blue Yeti",
        "price": Decimal("899.00"),
        "short_description": "Microfone condensador USB para gravações de alta qualidade",
        "description": (
            "O Blue Yeti é um microfone condensador USB amplamente usado por streamers e "
            "podcasters devido à sua qualidade sonora e versatilidade. Oferecendo "
            "múltiplos padrões de captação, ele é perfeito para diferentes tipos de "
            "gravação, seja streaming, podcasting ou entrevistas."
        ),
        "image": "product-9.jpg",
    },
]


def seed_products(session: Session) -> int:
    """Insere o catálogo se ainda não houver nenhum produto.

    Devolve quantos produtos foram criados (0 se já existiam).
    """
    already_seeded = session.scalar(select(Product.id).limit(1)) is not None
    if already_seeded:
        logger.info("Catálogo já populado — seed ignorado.")
        return 0

    session.add_all(Product(**product) for product in PRODUCTS)
    session.commit()
    logger.info("Catálogo populado com %d produtos.", len(PRODUCTS))
    return len(PRODUCTS)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    with SessionLocal() as session:
        created = seed_products(session)
    print(f"seed: {created} produto(s) criado(s)")


if __name__ == "__main__":
    main()
