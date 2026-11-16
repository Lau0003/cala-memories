# Desplegar en Cloudflare, paso a paso

Hazlo en este orden. La parte A se hace en tu computador y es la que evita casi todos los
errores: si el proyecto compila en tu computador, compila en Cloudflare.

---

## A. Preparar el proyecto en tu computador

1. Descomprime el zip nuevo y copia **todo su contenido encima de tu carpeta del proyecto**,
   aceptando reemplazar los archivos. Tu archivo `.env` no se toca.
2. En la terminal de VS Code, dentro de la carpeta del proyecto:

```bash
npm install
npm run build
```

3. `npm run build` debe terminar con una línea parecida a `✓ built in 3.21s` y crear la
   carpeta `dist`. **Si aquí sale un error, no sigas:** copia el mensaje completo y
   envíamelo. Cloudflare va a fallar con el mismo error.
4. Prueba que todo se ve bien:

```bash
npm run dev
```

5. Sube los cambios (incluye `package-lock.json`, que cambió al instalar Tailwind):

```bash
git add .
git commit -m "Secciones del panel, transiciones y ajustes de despliegue"
git push
```

6. Abre tu repositorio en github.com y confirma que **en la raíz** se ven `package.json`,
   `wrangler.jsonc` y la carpeta `src`. Si en cambio ves una sola carpeta (por ejemplo
   `cala-memories/`) y los archivos están adentro, anota ese nombre: lo necesitas en el
   paso B5.

---

## B. Crear el proyecto en Cloudflare

Si ya creaste uno y falló, bórralo primero para empezar limpio: entra al proyecto >
**Settings** > al final, **Delete**.

1. Entra a https://dash.cloudflare.com
2. Menú izquierdo: **Compute** > **Workers & Pages** (en algunas cuentas aparece directo como
   **Workers & Pages**).
3. Botón **Create** (o **Create application**) > **Import a repository** (o **Connect to
   Git**). Elige la opción de **Workers**, no la de Pages.
4. Conecta tu cuenta de GitHub, dale acceso al repositorio y selecciónalo.
5. Llena el formulario así:

| Campo | Valor |
| --- | --- |
| Project name | `cala-memories` (exactamente igual al `name` de `wrangler.jsonc`) |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory (en opciones avanzadas) | vacío o `/`. Solo si en el paso A6 viste los archivos dentro de una carpeta, escribe el nombre de esa carpeta |

6. Abre **Build variables** (o **Variables and secrets** dentro de la sección de build) y
   agrega estas dos, con los mismos valores de tu `.env`:

| Nombre | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu clave pública |

   Deben quedar como variables de **build**. Si solo las pones en las variables normales
   del Worker, la página abre pero dice "Falta conectar la base de datos".

7. **Create and deploy** (o **Save and deploy**). Espera uno o dos minutos.
8. Al terminar te muestra una dirección que termina en `.workers.dev`. Ábrela y prueba la
   tienda y `/admin`.

Desde ahora, cada `git push` publica solo.

---

## C. Si falla: busca tu error aquí

Abre el despliegue fallido > **View build** (o **Build logs**) y busca el texto en rojo.

| Texto del error | Qué pasa | Cómo se arregla |
| --- | --- | --- |
| `The name in your Wrangler configuration file (...) must match the name of your Worker` | El proyecto en Cloudflare se llama distinto a `cala-memories` | Abre `wrangler.jsonc` y cambia `"name"` por el nombre exacto que tiene el proyecto en Cloudflare. Guarda, `git add .`, `git commit`, `git push` |
| `npm ci can only install packages when your package.json and package-lock.json are in sync` | El archivo `package-lock.json` no coincide con `package.json` | En tu computador: `npm install`, luego `git add package-lock.json`, `git commit -m "lock"`, `git push`. Si sigue igual, corre `npm -v`, y en `package.json` agrega una línea `"packageManager": "npm@TU_VERSION",` debajo de `"version"`, y vuelve a subir |
| `Missing entry-point` o `Could not find wrangler.jsonc` / `package.json` | Cloudflare está mirando una carpeta donde no está el proyecto | **Settings** > **Build** > **Root directory**: pon la carpeta donde está `package.json` (ver paso A6) |
| `error TS...` (errores de TypeScript) | Estás con la versión anterior, que revisaba tipos al compilar | Usa el zip nuevo: su comando de build ya no se detiene por eso |
| `Cannot find module '@tailwindcss/vite'` o `Cannot find package 'tailwindcss'` | No se subió el `package.json` o el `package-lock.json` nuevos | Repite los pasos A2 y A5 |
| `vite: not found` o `sh: 1: vite: not found` | No se instalaron las dependencias (suele ir junto a un Root directory equivocado) | Revisa el Root directory |
| `Authentication error` o `code: 10000` al desplegar | El permiso de Cloudflare para desplegar se dañó | **Settings** > **Build** > **API token**: crea uno nuevo y selecciónalo |
| El build pasa, pero la página queda en blanco o da 404 | El comando de build o la carpeta de salida están mal | Build command debe ser `npm run build` y `wrangler.jsonc` debe decir `"directory": "./dist/"` (ya viene así) |
| La página abre y dice "Falta conectar la base de datos" | Faltan las variables de build | Paso B6, y luego **Deployments** > **Retry deployment** |
| Abre bien, pero `/admin` o un producto dan 404 al recargar | Falta `wrangler.jsonc` en el repositorio | Confirma que el archivo está en la raíz y trae `"not_found_handling": "single-page-application"` |

Si tu error no está en la tabla, copia las últimas 30 líneas del registro y envíamelas.

---

## D. Conectar tu dominio

Con el dominio comprado en Cloudflare, o agregado a tu cuenta de Cloudflare:

1. Entra al proyecto > **Settings** > **Domains & Routes** > **Add** > **Custom domain**.
2. Escribe el dominio (ej. `calamemories.com`) y confirma. Repite con `www.` si lo quieres.
3. Espera unos minutos; el https se configura solo.
