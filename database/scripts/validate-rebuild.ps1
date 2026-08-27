$ErrorActionPreference = 'Stop'

docker compose down --volumes
docker compose up --detach --wait
docker compose exec -T postgres sh /workspace/database/scripts/test.sh

Write-Host 'Reconstrução e testes concluídos com sucesso.'
