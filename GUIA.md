# CaLa memories · Guía paso a paso

Sigue las partes en orden. Los nombres de los botones en Supabase y Cloudflare pueden
cambiar un poco con el tiempo; si algo no coincide, busca el equivalente o pregúntame.

- Parte 1. Preparar tu computador
- Parte 2. Crear la base de datos en Supabase
- Parte 3. Ver el proyecto en tu computador
- Parte 4. Subirlo a GitHub
- Parte 5. Publicarlo en Cloudflare
- Parte 6. Conectar tu dominio
- Parte 7. Uso diario y mantenimiento

---

## Parte 1. Preparar tu computador

1. Instala **Node.js** versión LTS desde https://nodejs.org (incluye `npm`).
2. Instala **Git** desde https://git-scm.com si no lo tienes.
3. Descomprime `cala-memories.zip` y abre la carpeta `cala-memories` en Visual Studio Code
   (Archivo > Abrir carpeta).
4. Abre la terminal de VS Code (Terminal > Nueva terminal) y comprueba:

```bash
node -v
npm -v
git --version
```

Los tres deben responder con un número de versión. Node debe ser 20 o superior.

---

## Parte 2. Crear la base de datos en Supabase

### 2.1 Crear el proyecto

1. Entra a https://supabase.com y crea una cuenta.
2. **New project**. Nombre: `cala-memories`. Región: la más cercana (East US suele ir bien
   para Colombia).
3. Te pedirá una **contraseña de base de datos**: guárdala en un lugar seguro. No se usa
   en el código, pero la necesitarás si algún día haces respaldos avanzados.
4. Espera uno o dos minutos a que el proyecto termine de crearse.

### 2.2 Crear las tablas

1. En el menú izquierdo abre **SQL Editor** > **New query**.
2. Abre en VS Code el archivo `supabase/schema.sql`, copia **todo** y pégalo en el editor.
3. Presiona **Run**. Debe decir que terminó sin errores ("Success").

Este archivo crea todas las tablas (también las de órdenes, cotizador, inventario y
contenido, que usaremos en las siguientes fases), las reglas de seguridad y los dos
espacios para fotos.

### 2.3 Crear los dos usuarios

1. Menú **Authentication** > **Users** > **Add user** > **Create new user**.
2. Escribe el correo y una contraseña fuerte. Marca **Auto Confirm User**.
3. Repite para la segunda persona.

### 2.4 Darles acceso al panel

1. Abre `supabase/crear-admins.sql` en VS Code.
2. Cambia los dos correos y los dos nombres por los reales.
3. Copia el contenido, pégalo en **SQL Editor** > **New query** y presiona **Run**.
4. Al final deben aparecer **2 filas** con los nombres y correos.

### 2.5 Cerrar el registro público (importante)

1. **Authentication** > **Sign In / Providers** (o **Settings**).
2. Desactiva **Allow new users to sign up** y guarda.

Así nadie más puede crearse una cuenta. Aunque alguien lo lograra, solo los usuarios de la
tabla `admins` pueden ver o cambiar datos.

### 2.6 Copiar las credenciales

1. **Project Settings** > **API** (o **API Keys** y **Data API**).
2. Copia la **Project URL** (termina en `.supabase.co`).
3. Copia la clave **publishable** (empieza por `sb_publishable_`) o, si tu proyecto la
   muestra así, la clave **anon public**.

> Nunca copies al proyecto la clave **secret** ni la **service_role**. Esas dan acceso total
> y no deben estar en una página web.

---

## Parte 3. Ver el proyecto en tu computador

1. En VS Code, duplica el archivo `.env.example` y nombra la copia `.env`.
2. Abre `.env` y pega tus datos:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
```

3. En la terminal de VS Code:

```bash
npm install
npm run dev
```

4. Abre el enlace que aparece, normalmente http://localhost:5173

- Tienda: http://localhost:5173
- Panel: http://localhost:5173/admin

Para detener el servidor: `Ctrl + C` en la terminal.

### Primeros pasos dentro del panel

1. Entra a `/admin` con uno de los dos usuarios.
2. **Ajustes**: escribe el WhatsApp (`57` + celular, solo números), agrega los datos de pago
   y revisa las políticas. Guarda.
3. **Categorías**: deja las que vayas a usar.
4. **Productos** > **Crear producto**: nombre, precio, fotos, tipo, pasos de producción.
   Marca **Publicado en la tienda** y guarda.
5. Abre la tienda y revisa cómo se ve el producto y el botón **Comprar**.

### Si algo falla

| Lo que ves | Causa probable |
| --- | --- |
| "Falta conectar la base de datos" | No existe `.env`, o no reiniciaste `npm run dev` después de crearlo |
| "Correo o contraseña incorrectos" | El usuario no existe en Authentication o no marcaste Auto Confirm |
| "Este usuario no tiene acceso al panel" | Falta correr `crear-admins.sql` con ese correo |
| No sube la foto | No se corrió completo `schema.sql` (la parte de almacenamiento está al final) |
| Error al correr `npm install` | Copia el mensaje completo y envíamelo |

---

## Parte 4. Subirlo a GitHub

1. En https://github.com crea un repositorio nuevo llamado `cala-memories`, **privado**,
   sin README ni .gitignore (el proyecto ya los trae).
2. En la terminal de VS Code, dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Fase 1: tienda y panel de productos"
git branch -M main
git remote add origin https://github.com/JuanDevFL/cala-memories.git
git push -u origin main
```

El archivo `.env` no se sube (está en `.gitignore`). Es lo correcto.

Cada vez que cambies algo:

```bash
git add .
git commit -m "Describe el cambio"
git push
```

---

## Parte 5. Publicarlo en Cloudflare

1. Crea una cuenta en https://dash.cloudflare.com
2. Menú **Workers & Pages** (o **Compute**) > **Create** > **Import a repository**
   (conectar con GitHub).
3. Autoriza a Cloudflare a ver tu cuenta de GitHub y elige `cala-memories`.
4. Configura:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - Si pregunta por el directorio de salida: `dist`
5. Antes de desplegar, abre **Build variables** (o, después, **Settings** > **Build** >
   **Variables and secrets**) y agrega las dos mismas variables de tu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. **Deploy**. En uno o dos minutos te da una dirección que termina en `.workers.dev`.
7. Ábrela y prueba la tienda y `/admin`.

Desde ahora, cada `git push` a `main` publica solo la nueva versión.

Si la página carga pero dice "Falta conectar la base de datos", las variables no quedaron
como variables de **build**: agrégalas ahí y vuelve a desplegar (**Deployments** > **Retry**).

El archivo `wrangler.jsonc` ya le indica a Cloudflare que es un sitio de una sola página,
para que enlaces como `/producto/llavero` o `/admin` funcionen al recargar.

---

## Parte 6. Conectar tu dominio

Lo más simple es comprar el dominio en el mismo Cloudflare (**Domain Registration** >
**Register domains**), porque queda configurado solo. Si lo compras en otro lado, tendrás
que agregar el dominio a Cloudflare y cambiar los "nameservers" donde lo compraste por los
que Cloudflare te indique.

Con el dominio ya en tu cuenta de Cloudflare:

1. **Workers & Pages** > `cala-memories` > **Settings** > **Domains & Routes** > **Add** >
   **Custom domain**.
2. Escribe tu dominio (por ejemplo `calamemories.com`) y confirma.
3. Repite con `www.calamemories.com` si quieres que también funcione con www.
4. Espera unos minutos. El certificado de seguridad (https) se crea solo.

No hay que cambiar nada en Supabase ni en el código.

---

## Parte 7. Uso diario y mantenimiento

**Cambiar el logo.** Reemplaza los archivos de `public/brand/` conservando los nombres
(`isotipo-oscuro.png`, `isotipo-claro.png`) y `public/favicon.png`. Los actuales salieron
de las imágenes que me enviaste; si tienes el SVG, quedará más nítido.

**Cambiar colores o tipografías.** Están al inicio de `src/styles/base.css`, en `:root`.

**Fotos.** Al subirlas, el panel las reduce a WebP de máximo 1600 px (unos 150-250 KB).
Con 1 GB gratis caben varios miles. También puedes pegar un enlace externo.

**Respaldo.** El plan gratis de Supabase no hace copias automáticas. Una vez por semana:
**Table Editor** > abre cada tabla importante (`products`, `orders`) > **Export** > CSV.
Cuando haya ventas reales seguidas, vale la pena evaluar el plan de pago.

**Pausa por inactividad.** Supabase pausa los proyectos gratis tras una semana sin uso.
Si entran al panel o hay visitas cada semana, no pasa. Si llegara a pasar, se reactiva
desde el panel de Supabase con **Restore project**.

---

## Estructura del proyecto

```
cala-memories/
├─ GUIA.md                  esta guía
├─ index.html               página base (título, fuentes)
├─ package.json             dependencias y comandos
├─ wrangler.jsonc           configuración de Cloudflare
├─ .env.example             plantilla de credenciales
├─ public/
│  ├─ favicon.png
│  └─ brand/                logos
├─ supabase/
│  ├─ schema.sql            base de datos completa
│  └─ crear-admins.sql      acceso de los dos usuarios
└─ src/
   ├─ main.tsx              arranque
   ├─ App.tsx               rutas de toda la aplicación
   ├─ lib/                  conexión, sesión, ajustes, formatos, fotos, tipos
   ├─ components/           piezas reutilizables (logo, tarjeta, pasos, fotos…)
   ├─ layouts/              marco de la tienda y marco del panel
   ├─ pages/
   │  ├─ tienda/            inicio, producto, políticas
   │  └─ admin/             login, resumen, productos, categorías, ajustes
   └─ styles/               base.css, tienda.css, admin.css
```

## Qué incluye esta fase y qué sigue

Fase 1 (esta entrega): tienda pública, página de producto con datos de pago y WhatsApp,
políticas, login, productos con fotos, opciones, combos y pasos de producción, categorías
y ajustes.

- Fase 2: órdenes (cliente, dirección, fotos de referencia, pago, avance por pasos) y tareas.
- Fase 3: cotizador e inventario de insumos.
- Fase 4: lanzamientos y calendario de contenido.

Las tablas de las fases 2 a 4 ya quedan creadas, así que no habrá que tocar la base de
datos de nuevo salvo ajustes menores.
