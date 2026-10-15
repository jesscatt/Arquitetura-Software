# frontend/ — cópia espelho da interface

A interface que realmente roda é servida a partir de `backend/public`, na mesma
porta da API (sem CORS e sem build).

Esta pasta é uma cópia idêntica, mantida apenas para publicação estática
(GitHub Pages, por exemplo). Ao editar a interface, altere `backend/public` e
depois copie os arquivos de novo para cá.

Publicada isoladamente, esta cópia não funciona: ela depende da API do backend.
