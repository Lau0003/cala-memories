# CaLa memories · Guía paso a paso

Sigue las partes en orden. Los nombres de los botones en Supabase y Cloudflare pueden
cambiar un poco con el tiempo; si algo no coincide, busca el equivalente o pregúntame.

- Parte 1. Preparar tu computador
- Parte 2. Crear la base de datos en Supabase
- Parte 3. Ver el proyecto en tu computador
- Parte 4. Subirlo a GitHub
- Parte 5. Publicarlo en Cloudflare (versión detallada y solución de errores en `DESPLIEGUE-CLOUDFLARE.md`)
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
   │  └─ admin/             login, resumen, órdenes, tareas, productos, categorías,
   │                        cotizador, inventario, lanzamientos, contenido, ajustes
   └─ styles/               tailwind.css, base.css, tienda.css, admin.css,
                            admin-secciones.css, motion.css
```

## Qué incluye

**Tienda:** inicio con catálogo y filtros, página de producto con datos de pago y WhatsApp,
políticas y botón flotante de WhatsApp (aparece cuando guardas el número en Ajustes).

**Panel:**

- **Resumen:** órdenes en curso, órdenes sin pago y tus tareas.
- **Órdenes:** se crean desde un producto o 100 % personalizadas. Piden dirección, correo o
  foto de referencia según lo configurado en el producto. Tienen estado, pago, casilla
  "desarrollar sin pago anticipado", pasos de producción para marcar, material usado
  (descuenta del inventario) e historial con notas.
- **Tareas:** pendientes por responsable, con fecha límite.
- **Productos y categorías.**
- **Cotizador:** material, merma, energía, desgaste, mano de obra, embalaje y otros costos.
  Sugiere precios al 30, 35 y 40 % de ganancia; tú escribes el precio final y puedes
  aplicarlo al producto.
- **Inventario:** insumos, compras (calcula el costo promedio) y ajustes de cantidad.
- **Lanzamientos:** tarjetas con fecha, estado y enlaces al material audiovisual.
- **Contenido:** tablero de ideas, pendientes, programados y publicados.
- **Ajustes:** WhatsApp, datos de pago, tiempos, textos, políticas y redes.

## Orden recomendado para empezar a cotizar

1. **Inventario:** crea tus filamentos y registra la compra de cada rollo (ej. 1000 g por
   lo que te costó).
2. **Cotizador > Parámetros de costo:** valor de tu hora, tarifa del kWh (sale en la
   factura de energía), consumo de la impresora en vatios, desgaste, merma y embalaje.
3. **Cotizador:** agrega los gramos de cada material, las horas de impresión y tus horas
   de trabajo. Elige un precio sugerido o escribe el tuyo.

## Tailwind y transiciones

Tailwind v4 está instalado y configurado en `src/styles/tailwind.css`, con los colores de
la marca como clases (`bg-carbon`, `text-crema`, `border-arena`, `font-titulos`). Puedes
usar clases de Tailwind en cualquier componente. Se cargó sin su reinicio de estilos para
no alterar el diseño existente.

Las transiciones de la página (cambio de página, apertura de paneles, aparición de
productos, botones) están en `src/styles/motion.css`.

Para desplegar o resolver errores de Cloudflare, sigue `DESPLIEGUE-CLOUDFLARE.md`.
