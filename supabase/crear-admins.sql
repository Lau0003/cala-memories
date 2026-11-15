-- =====================================================================
-- Dar acceso al panel a los dos usuarios.
-- ANTES: crea los dos usuarios en Supabase > Authentication > Users > Add user
-- (ver GUIA.md, parte 2, paso 5).
-- DESPUÉS: cambia los correos y nombres de abajo y corre este archivo
-- en SQL Editor.
-- =====================================================================

insert into public.admins (user_id, display_name)
select id, 'Juan' from auth.users where email = 'correo-de-juan@ejemplo.com';

insert into public.admins (user_id, display_name)
select id, 'Nombre 2' from auth.users where email = 'correo-del-segundo@ejemplo.com';

-- Comprobación: deben salir 2 filas.
select a.display_name, u.email
from public.admins a join auth.users u on u.id = a.user_id;
