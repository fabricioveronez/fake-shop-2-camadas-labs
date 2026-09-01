# Manifestos Kubernetes — fake-shop

Aplicados pelo `make apps` do [labs-k8s](https://github.com/fabricioveronez/labs-k8s),
que substitui a tag das imagens pelo short SHA do commit corrente deste repositório
antes do `kubectl apply`.

| Arquivo | Conteúdo |
|---|---|
| `00-namespace.yaml` | namespace `fake-shop` |
| `10-postgres.yaml` | Secret, Service headless e StatefulSet do PostgreSQL 16 |
| `20-configmap.yaml` | `nginx.conf` do front — **peça load-bearing**, ver comentários |
| `30-api.yaml` | Service `api`, Deployment `fake-shop-api`, Job de migration + seed |
| `40-web.yaml` | Service, Deployment `fake-shop-web` e Ingress |
| `50-observability.yaml` | ServiceMonitor e PrometheusRule |

## Ordem

Os prefixos numéricos existem porque o Job de migration precisa do Postgres de pé e
o front precisa do Service `api`. `kubectl apply -f k8s/` respeita a ordem alfabética
dos arquivos.

## Detalhes que não são óbvios

**O tráfego sintético não vive mais aqui.** Havia um `60-traffic.yaml` com um
Deployment de curl em loop dentro deste namespace. Ele batia no ClusterIP, então
desviava do ingress e deixava o access log e as métricas por router do Traefik
vazios; suas linhas ainda se misturavam às da aplicação no Loki, e ele contava
como réplica indisponível no alerta de deployment degradado. A carga passou a
sair da máquina do operador e entrar pelo Ingress — `make traffic` no
[labs-k8s](https://github.com/fabricioveronez/labs-k8s).

**O Service da API se chama `api`, não `fake-shop-api`.** O `nginx.conf` original,
assado na imagem do front, faz `proxy_pass http://api:8000`. Renomear o Service quebra
o front.

**O `nginx.conf` sai da imagem e vira ConfigMap.** O nginx resolve hostnames de
upstream uma única vez, no start, e aborta se falhar — com o arquivo da imagem, o pod
web não sobe se o Service `api` ainda não existir. A versão do ConfigMap usa `resolver`
e `proxy_pass` por variável, o que torna a resolução preguiçosa.

**A liveness da API não toca o banco; a readiness toca.** Se o Postgres cair, os pods
saem do Service (sintoma visível) em vez de entrarem em crashloop (sintoma opaco).

**A migration é um Job, não um initContainer.** Com 2 réplicas, N containers rodando
`alembic upgrade head` simultaneamente disputam lock. O Job usa a mesma imagem da API,
que já traz `alembic.ini` e `migrations/`.
