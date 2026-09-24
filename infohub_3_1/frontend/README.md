# frontend/ — cópia espelho da interface

A interface que realmente roda é servida a partir de `backend/public`, na mesma
porta da API (sem CORS e sem build).

Esta pasta é uma **cópia idêntica**, mantida apenas para publicação estática
(GitHub Pages, por exemplo). Ao editar a interface, altere `backend/public` e
depois sincronize:

```powershell
# Windows
robocopy ..\backend\public . /MIR /XF README.md

# Linux/macOS
rsync -a --delete --exclude README.md ../backend/public/ ./
```

Publicada isoladamente, esta cópia não funciona: ela depende da API do backend.
