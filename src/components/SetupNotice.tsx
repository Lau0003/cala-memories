/** Se muestra solo cuando falta el archivo .env con los datos de Supabase. */
export default function SetupNotice() {
  return (
    <main className="setup-notice">
      <img src="/brand/isotipo-oscuro.png" alt="" width={56} />
      <h1>Falta conectar la base de datos</h1>
      <p>
        El proyecto está corriendo, pero todavía no encuentra los datos de Supabase.
      </p>
      <ol>
        <li>
          Copia el archivo <code>.env.example</code> y nómbralo <code>.env</code>.
        </li>
        <li>
          Pega ahí la URL y la clave pública de tu proyecto de Supabase.
        </li>
        <li>
          Detén el servidor con <code>Ctrl + C</code> y vuelve a correr <code>npm run dev</code>.
        </li>
      </ol>
      <p>El paso a paso completo está en el archivo <code>GUIA.md</code>, parte 2.</p>
    </main>
  )
}
