-- =====================================================================
-- Retiros Holísticos — esquema inicial para Supabase (PostgreSQL 15+)
-- Seguridad: RLS en todas las tablas; las escrituras sensibles solo mediante funciones
-- SECURITY DEFINER que comprueban permisos en el servidor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Funciones auxiliares de sesión (Supabase ya define auth.uid() y auth.jwt())
-- ---------------------------------------------------------------------
create or replace function public.email_sesion() returns text
language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  rol text not null default 'compradora' check (rol in ('compradora', 'admin')),
  creado timestamptz not null default now()
);

create table if not exists public.accesos (
  email text primary key check (email = lower(email) and position('@' in email) > 1),
  user_id uuid references auth.users(id) on delete set null,
  estado text not null check (estado in ('activo', 'pendiente', 'reembolsado', 'cancelado', 'revocado', 'contracargo', 'en-disputa')),
  origen text not null check (origen in ('hotmart', 'manual')),
  transaccion text,
  producto text,
  desde timestamptz,
  ultimo_evento timestamptz,
  ultimo_evento_ts bigint,
  invitacion_enviada boolean not null default false,
  nota text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists accesos_user_idx on public.accesos(user_id);

create table if not exists public.eventos_hotmart (
  id text primary key,
  evento text not null,
  transaccion text,
  email text,
  producto text,
  creado_hotmart bigint,
  recibido timestamptz not null default now(),
  estado text not null,
  detalle text,
  resumen jsonb not null default '{}'::jsonb
);
create index if not exists eventos_hotmart_trx_idx on public.eventos_hotmart(transaccion);

create table if not exists public.actividades (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  estado text not null check (estado in ('borrador', 'revision', 'publicado', 'archivado')),
  version int not null default 1,
  orden int not null default 9999,
  datos jsonb not null,
  datos_publicos jsonb,
  actualizado timestamptz not null default now(),
  actualizado_por uuid
);

create table if not exists public.actividad_versiones (
  actividad_id text not null references public.actividades(id) on delete cascade,
  version int not null,
  estado text not null,
  datos jsonb not null,
  nota text,
  autor uuid,
  creado timestamptz not null default now(),
  primary key (actividad_id, version)
);

create table if not exists public.catalogo_meta (
  clave text primary key,
  valor jsonb not null,
  publico boolean not null default false,
  actualizado timestamptz not null default now()
);

create table if not exists public.datos_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now(),
  check (octet_length(datos::text) < 2000000)
);

create table if not exists public.retiros (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 80),
  datos jsonb not null,
  eliminado timestamptz,
  actualizado timestamptz not null default now(),
  primary key (user_id, id),
  check (octet_length(datos::text) < 3000000)
);

create table if not exists public.uso_asistente (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  consultas int not null default 0,
  tokens_entrada bigint not null default 0,
  tokens_salida bigint not null default 0,
  primary key (user_id, dia)
);

-- ---------------------------------------------------------------------
-- Permisos y acceso
-- ---------------------------------------------------------------------
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from perfiles where user_id = auth.uid() and rol = 'admin') $$;

create or replace function public.tiene_acceso() returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and (
    es_admin() or exists (
      select 1 from accesos a
      where a.estado = 'activo' and (a.user_id = auth.uid() or (a.user_id is null and a.email = email_sesion()))
    )
  )
$$;

-- Vincula la cuenta con su acceso (por el correo verificado de la sesión) y devuelve rol y estado.
create or replace function public.estado_acceso()
returns table (rol text, acceso text, origen text, desde timestamptz)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := email_sesion();
begin
  if v_uid is null then
    raise exception 'Sesión no válida' using errcode = '28000';
  end if;
  insert into perfiles (user_id, email) values (v_uid, v_email)
  on conflict (user_id) do update set email = excluded.email;
  if v_email <> '' then
    update accesos set user_id = v_uid, actualizado = now()
    where email = v_email and user_id is distinct from v_uid;
  end if;
  return query
    select p.rol, coalesce(a.estado, 'sin-acceso'), a.origen, a.desde
    from perfiles p
    left join accesos a on a.email = v_email
    where p.user_id = v_uid;
end
$$;

-- ---------------------------------------------------------------------
-- Catálogo: depuración para compradoras (equivalente a paraCompradora en src/domain/visibility.ts)
-- ---------------------------------------------------------------------
create or replace function public.filtrar_retenidos(l jsonb) returns jsonb
language sql immutable
as $$
  select coalesce(jsonb_agg(x.v order by x.i), '[]'::jsonb)
  from jsonb_array_elements(coalesce(l, '[]'::jsonb)) with ordinality as x(v, i)
  where coalesce((x.v ->> 'retenido')::boolean, false) = false
$$;

create or replace function public.sanear_publico(d jsonb) returns jsonb
language sql immutable
as $$
  select d || jsonb_build_object(
    'preparacion', filtrar_retenidos(d -> 'preparacion'),
    'adaptaciones', filtrar_retenidos(d -> 'adaptaciones'),
    'consentimiento', filtrar_retenidos(d -> 'consentimiento'),
    'criteriosPausa', filtrar_retenidos(d -> 'criteriosPausa'),
    'cuandoUtilizar', filtrar_retenidos(d -> 'cuandoUtilizar'),
    'cuandoEvitar', filtrar_retenidos(d -> 'cuandoEvitar'),
    'queObservar', filtrar_retenidos(d -> 'queObservar'),
    'recomendaciones', filtrar_retenidos(d -> 'recomendaciones'),
    'variantes', (
      select coalesce(jsonb_agg(x.v order by x.i), '[]'::jsonb)
      from jsonb_array_elements(coalesce(d -> 'variantes', '[]'::jsonb)) with ordinality as x(v, i)
      where x.v ->> 'estado' = 'publicado'
    ),
    'fuentes', (
      select coalesce(jsonb_agg(x.v order by x.i), '[]'::jsonb)
      from jsonb_array_elements(coalesce(d -> 'fuentes', '[]'::jsonb)) with ordinality as x(v, i)
      where x.v ->> 'archivo' <> 'sistema'
    ),
    'incidencias', '[]'::jsonb,
    'propuestas', '[]'::jsonb,
    'notasAdmin', '[]'::jsonb,
    'correcciones', '[]'::jsonb,
    'clasificacion', '{}'::jsonb,
    'sistemaProfesional', null,
    'motivoEstado', null
  )
$$;

-- Requisitos mínimos de publicación comprobados también en el servidor.
create or replace function public.publicable(d jsonb) returns boolean
language sql immutable
as $$
  select jsonb_typeof(d -> 'duracion') = 'object'
    and jsonb_typeof(d -> 'fases') = 'array'
    and jsonb_array_length(d -> 'fases') > 0
    and not exists (
      select 1 from jsonb_array_elements(d -> 'fases') f
      where jsonb_typeof(f -> 'tiempo') is distinct from 'object'
         or jsonb_typeof(f -> 'pasos') is distinct from 'array'
         or jsonb_array_length(f -> 'pasos') = 0
    )
    and jsonb_typeof(d -> 'consentimiento') = 'array'
    and jsonb_array_length(d -> 'consentimiento') > 0
    and length(coalesce(d ->> 'titulo', '')) > 0
$$;

-- Fichas publicadas y depuradas para quien tiene acceso activo.
create or replace function public.catalogo_publicado()
returns table (id text, version int, datos jsonb)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not tiene_acceso() then
    raise exception 'Sin acceso activo' using errcode = '42501';
  end if;
  return query
    select a.id, a.version, a.datos_publicos
    from actividades a
    where a.estado = 'publicado' and a.datos_publicos is not null
    order by a.orden, a.id;
end
$$;

-- Guardado de administración con versión e historial.
create or replace function public.guardar_actividad(p_datos jsonb, p_nota text default '')
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id text := p_datos ->> 'id';
  v_estado text := p_datos ->> 'estado';
  v_ver int;
  v_datos jsonb;
begin
  if not es_admin() then
    raise exception 'Solo la administración puede editar el catálogo' using errcode = '42501';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9-]{1,80}$' then
    raise exception 'Identificador no válido' using errcode = '22023';
  end if;
  if v_estado is null or v_estado not in ('borrador', 'revision', 'publicado', 'archivado') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if octet_length(p_datos::text) > 1000000 then
    raise exception 'La actividad es demasiado grande' using errcode = '22023';
  end if;
  select a.version into v_ver from actividades a where a.id = v_id for update;
  v_ver := coalesce(v_ver, 0) + 1;
  v_datos := p_datos || jsonb_build_object('version', v_ver, 'actualizado', to_char(now(), 'YYYY-MM-DD'));
  if v_estado = 'publicado' and not publicable(v_datos) then
    raise exception 'La actividad no cumple los requisitos para publicarse' using errcode = '23514';
  end if;
  insert into actividades (id, estado, version, orden, datos, datos_publicos, actualizado, actualizado_por)
  values (v_id, v_estado, v_ver, coalesce((v_datos ->> 'orden')::int, 9999), v_datos,
          case when v_estado = 'publicado' then sanear_publico(v_datos) end, now(), auth.uid())
  on conflict (id) do update set
    estado = excluded.estado, version = excluded.version, orden = excluded.orden, datos = excluded.datos,
    datos_publicos = excluded.datos_publicos, actualizado = now(), actualizado_por = auth.uid();
  insert into actividad_versiones (actividad_id, version, estado, datos, nota, autor)
  values (v_id, v_ver, v_estado, v_datos, left(coalesce(p_nota, ''), 300), auth.uid());
  return v_datos;
end
$$;

create or replace function public.guardar_config_catalogo(p_config jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_orden jsonb := p_config -> 'ordenMomentos';
begin
  if not es_admin() then
    raise exception 'Solo la administración puede cambiar la configuración' using errcode = '42501';
  end if;
  if jsonb_typeof(v_orden) <> 'array' or jsonb_array_length(v_orden) <> 5
     or exists (select 1 from jsonb_array_elements_text(v_orden) m where m not in ('apertura', 'conexion', 'exploracion', 'integracion', 'cierre'))
     or (select count(distinct m) from jsonb_array_elements_text(v_orden) m) <> 5 then
    raise exception 'Orden de momentos no válido' using errcode = '22023';
  end if;
  insert into catalogo_meta (clave, valor, publico, actualizado)
  values ('config', jsonb_build_object('ordenMomentos', v_orden), true, now())
  on conflict (clave) do update set valor = excluded.valor, publico = true, actualizado = now();
end
$$;

-- Importación inicial del catálogo (solo con la clave de servicio o desde el editor SQL).
create or replace function public.importar_catalogo(p_catalogo jsonb)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  a jsonb;
  n int := 0;
  v_estado text;
begin
  for a in select * from jsonb_array_elements(p_catalogo -> 'actividades') loop
    v_estado := a ->> 'estado';
    if v_estado = 'publicado' and not publicable(a) then
      v_estado := 'revision';
      a := a || jsonb_build_object('estado', 'revision', 'motivoEstado', 'Importada en revisión: no cumple los requisitos mínimos de publicación.');
    end if;
    insert into actividades (id, estado, version, orden, datos, datos_publicos)
    values (a ->> 'id', v_estado, coalesce((a ->> 'version')::int, 1), coalesce((a ->> 'orden')::int, 9999), a,
            case when v_estado = 'publicado' then sanear_publico(a) end)
    on conflict (id) do update set
      estado = excluded.estado, version = greatest(actividades.version, excluded.version), orden = excluded.orden,
      datos = excluded.datos, datos_publicos = excluded.datos_publicos, actualizado = now();
    insert into actividad_versiones (actividad_id, version, estado, datos, nota)
    values (a ->> 'id', coalesce((a ->> 'version')::int, 1), v_estado, a, 'Importación')
    on conflict do nothing;
    n := n + 1;
  end loop;
  -- Metadatos públicos (sin enlaces a los PDF originales) y privados (solo administración).
  insert into catalogo_meta (clave, valor, publico) values
    ('base', jsonb_build_object(
      'schema', p_catalogo -> 'schema', 'generado', p_catalogo -> 'generado',
      'fuentes', (select coalesce(jsonb_object_agg(k, (v - 'drive') || jsonb_build_object('drive', '')), '{}'::jsonb) from jsonb_each(coalesce(p_catalogo -> 'fuentes', '{}'::jsonb)) as f(k, v) where k <> 'sistema'),
      'materialesCanonicos', p_catalogo -> 'materialesCanonicos',
      'opcionesConsentimiento', p_catalogo -> 'opcionesConsentimiento'), true),
    ('incidencias', coalesce(p_catalogo -> 'incidenciasDocumento', '{}'::jsonb), false),
    ('fuentes_admin', coalesce(p_catalogo -> 'fuentes', '{}'::jsonb), false)
  on conflict (clave) do update set valor = excluded.valor, publico = excluded.publico, actualizado = now();
  return n;
end
$$;

-- ---------------------------------------------------------------------
-- Accesos: altas manuales y eventos de Hotmart
-- ---------------------------------------------------------------------
create or replace function public.conceder_acceso_manual(p_email text, p_nota text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if not es_admin() then
    raise exception 'Solo la administración puede conceder accesos' using errcode = '42501';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo no válido' using errcode = '22023';
  end if;
  insert into accesos (email, estado, origen, desde, nota, actualizado)
  values (v_email, 'activo', 'manual', now(), left(p_nota, 300), now())
  on conflict (email) do update set
    estado = 'activo', origen = 'manual', desde = coalesce(accesos.desde, now()),
    nota = left(coalesce(p_nota, accesos.nota), 300), actualizado = now();
end
$$;

create or replace function public.revocar_acceso(p_email text, p_motivo text default null)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not es_admin() then
    raise exception 'Solo la administración puede revocar accesos' using errcode = '42501';
  end if;
  update accesos set estado = 'revocado', nota = left(coalesce(p_motivo, nota), 300), actualizado = now()
  where email = lower(trim(p_email));
end
$$;

-- Procesa un evento (formato webhook 2.0.0) de forma idempotente. Solo para la clave de servicio.
-- Política propuesta (a confirmar por la propietaria):
--   APPROVED / COMPLETE  → activo         REFUNDED  → reembolsado (sin acceso)
--   CHARGEBACK           → contracargo    CANCELED / EXPIRED → cancelado
--   PROTEST              → se registra; el acceso activo se mantiene mientras se resuelve
--   DELAYED / BILLET_PRINTED → pendiente (sin acceso)
create or replace function public.procesar_evento_hotmart(p_evento jsonb, p_productos text[])
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_id text := p_evento ->> 'id';
  v_evento text := p_evento ->> 'event';
  v_ts bigint := nullif(p_evento ->> 'creation_date', '')::bigint;
  v_email text := lower(trim(coalesce(p_evento #>> '{data,buyer,email}', '')));
  v_trx text := p_evento #>> '{data,purchase,transaction}';
  v_prod text := p_evento #>> '{data,product,id}';
  v_nuevo text;
  v_actual accesos%rowtype;
  v_existia boolean;
  v_invitar boolean := false;
begin
  if v_id is null or v_evento is null then
    raise exception 'Evento sin identificador o tipo' using errcode = '22023';
  end if;
  insert into eventos_hotmart (id, evento, transaccion, email, producto, creado_hotmart, estado, resumen)
  values (v_id, v_evento, v_trx, nullif(v_email, ''), v_prod, v_ts, 'recibido',
          jsonb_build_object('version', p_evento ->> 'version', 'status', p_evento #>> '{data,purchase,status}'))
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('resultado', 'duplicado');
  end if;

  if v_prod is null or not (v_prod = any (p_productos)) then
    update eventos_hotmart set estado = 'ignorado', detalle = 'Producto no incluido en la app' where id = v_id;
    return jsonb_build_object('resultado', 'ignorado', 'motivo', 'producto');
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    update eventos_hotmart set estado = 'ignorado', detalle = 'Sin correo válido' where id = v_id;
    return jsonb_build_object('resultado', 'ignorado', 'motivo', 'correo');
  end if;

  v_nuevo := case v_evento
    when 'PURCHASE_APPROVED' then 'activo'
    when 'PURCHASE_COMPLETE' then 'activo'
    when 'PURCHASE_REFUNDED' then 'reembolsado'
    when 'PURCHASE_CHARGEBACK' then 'contracargo'
    when 'PURCHASE_CANCELED' then 'cancelado'
    when 'PURCHASE_EXPIRED' then 'cancelado'
    when 'PURCHASE_PROTEST' then 'en-disputa'
    when 'PURCHASE_DELAYED' then 'pendiente'
    when 'PURCHASE_BILLET_PRINTED' then 'pendiente'
    else null end;
  if v_nuevo is null then
    update eventos_hotmart set estado = 'ignorado', detalle = 'Tipo de evento no gestionado' where id = v_id;
    return jsonb_build_object('resultado', 'ignorado', 'motivo', 'evento');
  end if;

  select * into v_actual from accesos where email = v_email for update;
  v_existia := found;

  if v_existia then
    if v_actual.ultimo_evento_ts is not null and v_ts is not null and v_ts < v_actual.ultimo_evento_ts
       and coalesce(v_actual.transaccion, '') = coalesce(v_trx, '') then
      update eventos_hotmart set estado = 'atrasado', detalle = 'Llegó después de un evento más reciente de la misma compra' where id = v_id;
      return jsonb_build_object('resultado', 'atrasado');
    end if;
    -- Un evento de otra compra (o un alta manual) no quita un acceso activo, salvo reembolso o contracargo de esa misma compra.
    if v_actual.estado = 'activo' and v_nuevo <> 'activo'
       and (coalesce(v_actual.transaccion, '') <> coalesce(v_trx, '') or v_nuevo in ('pendiente', 'en-disputa')) then
      update eventos_hotmart set estado = 'sin-cambio',
        detalle = case when v_nuevo = 'en-disputa' then 'Compra en disputa: se mantiene el acceso hasta su resolución' else 'El acceso activo corresponde a otra compra o alta' end
      where id = v_id;
      if v_nuevo = 'en-disputa' then
        update accesos set nota = left('Compra en disputa (' || coalesce(v_trx, '') || ')', 300), ultimo_evento = now(), actualizado = now() where email = v_email;
      end if;
      return jsonb_build_object('resultado', 'sin-cambio', 'estado', v_actual.estado);
    end if;
    update accesos set
      estado = v_nuevo,
      origen = case when v_nuevo = 'activo' then 'hotmart' else origen end,
      transaccion = coalesce(v_trx, transaccion),
      producto = v_prod,
      desde = case when v_nuevo = 'activo' and estado <> 'activo' then now() else desde end,
      ultimo_evento = now(),
      ultimo_evento_ts = coalesce(v_ts, ultimo_evento_ts),
      actualizado = now()
    where email = v_email;
    v_invitar := v_nuevo = 'activo' and not v_actual.invitacion_enviada;
  else
    insert into accesos (email, estado, origen, transaccion, producto, desde, ultimo_evento, ultimo_evento_ts)
    values (v_email, v_nuevo, 'hotmart', v_trx, v_prod, case when v_nuevo = 'activo' then now() end, now(), v_ts);
    v_invitar := v_nuevo = 'activo';
  end if;

  update eventos_hotmart set estado = 'aplicado', detalle = 'Acceso: ' || v_nuevo where id = v_id;
  return jsonb_build_object('resultado', 'aplicado', 'estado', v_nuevo, 'email', v_email, 'invitar', v_invitar);
end
$$;

create or replace function public.marcar_invitacion_enviada(p_email text)
returns void
language sql security definer set search_path = public
as $$ update accesos set invitacion_enviada = true, actualizado = now() where email = lower(trim(p_email)) $$;

-- ---------------------------------------------------------------------
-- Asistente: cuota diaria atómica y registro de tokens (solo clave de servicio)
-- ---------------------------------------------------------------------
create or replace function public.consumir_cuota_asistente(p_user uuid, p_limite int)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_consultas int;
begin
  insert into uso_asistente (user_id, dia, consultas) values (p_user, current_date, 1)
  on conflict (user_id, dia) do update set consultas = uso_asistente.consultas + 1
  where uso_asistente.consultas < p_limite
  returning consultas into v_consultas;
  if v_consultas is null then
    return -1;
  end if;
  return p_limite - v_consultas;
end
$$;

create or replace function public.registrar_tokens_asistente(p_user uuid, p_entrada int, p_salida int)
returns void
language sql security definer set search_path = public
as $$
  update uso_asistente set tokens_entrada = tokens_entrada + greatest(p_entrada, 0), tokens_salida = tokens_salida + greatest(p_salida, 0)
  where user_id = p_user and dia = current_date
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.accesos enable row level security;
alter table public.eventos_hotmart enable row level security;
alter table public.actividades enable row level security;
alter table public.actividad_versiones enable row level security;
alter table public.catalogo_meta enable row level security;
alter table public.datos_usuario enable row level security;
alter table public.retiros enable row level security;
alter table public.uso_asistente enable row level security;

drop policy if exists perfiles_lectura on public.perfiles;
create policy perfiles_lectura on public.perfiles for select to authenticated using (user_id = auth.uid() or es_admin());

drop policy if exists accesos_admin on public.accesos;
create policy accesos_admin on public.accesos for select to authenticated using (es_admin());

drop policy if exists eventos_admin on public.eventos_hotmart;
create policy eventos_admin on public.eventos_hotmart for select to authenticated using (es_admin());

drop policy if exists actividades_admin on public.actividades;
create policy actividades_admin on public.actividades for select to authenticated using (es_admin());

drop policy if exists versiones_admin on public.actividad_versiones;
create policy versiones_admin on public.actividad_versiones for select to authenticated using (es_admin());

drop policy if exists meta_lectura on public.catalogo_meta;
create policy meta_lectura on public.catalogo_meta for select to authenticated using (es_admin() or (publico and tiene_acceso()));

drop policy if exists datos_propios_lectura on public.datos_usuario;
create policy datos_propios_lectura on public.datos_usuario for select to authenticated using (user_id = auth.uid());
drop policy if exists datos_propios_alta on public.datos_usuario;
create policy datos_propios_alta on public.datos_usuario for insert to authenticated with check (user_id = auth.uid() and tiene_acceso());
drop policy if exists datos_propios_cambio on public.datos_usuario;
create policy datos_propios_cambio on public.datos_usuario for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and tiene_acceso());
drop policy if exists datos_propios_baja on public.datos_usuario;
create policy datos_propios_baja on public.datos_usuario for delete to authenticated using (user_id = auth.uid());

drop policy if exists retiros_propios_lectura on public.retiros;
create policy retiros_propios_lectura on public.retiros for select to authenticated using (user_id = auth.uid());
drop policy if exists retiros_propios_alta on public.retiros;
create policy retiros_propios_alta on public.retiros for insert to authenticated with check (user_id = auth.uid() and tiene_acceso());
drop policy if exists retiros_propios_cambio on public.retiros;
create policy retiros_propios_cambio on public.retiros for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and tiene_acceso());
drop policy if exists retiros_propios_baja on public.retiros;
create policy retiros_propios_baja on public.retiros for delete to authenticated using (user_id = auth.uid());

drop policy if exists uso_propio on public.uso_asistente;
create policy uso_propio on public.uso_asistente for select to authenticated using (user_id = auth.uid() or es_admin());

-- Privilegios de tabla: nada para anónimos; lo mínimo para usuarios autenticados (RLS filtra filas).
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
grant select on public.perfiles, public.accesos, public.eventos_hotmart, public.actividades, public.actividad_versiones, public.catalogo_meta, public.uso_asistente to authenticated;
grant select, insert, update, delete on public.datos_usuario, public.retiros to authenticated;

-- Funciones: ejecución explícita.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant execute on function public.email_sesion(), public.es_admin(), public.tiene_acceso(), public.estado_acceso(), public.catalogo_publicado(),
  public.guardar_actividad(jsonb, text), public.guardar_config_catalogo(jsonb), public.conceder_acceso_manual(text, text), public.revocar_acceso(text, text),
  public.filtrar_retenidos(jsonb), public.sanear_publico(jsonb), public.publicable(jsonb)
  to authenticated;
grant execute on function public.procesar_evento_hotmart(jsonb, text[]), public.marcar_invitacion_enviada(text), public.consumir_cuota_asistente(uuid, int),
  public.registrar_tokens_asistente(uuid, int, int), public.importar_catalogo(jsonb), public.catalogo_publicado(), public.estado_acceso(),
  public.email_sesion(), public.es_admin(), public.tiene_acceso(), public.filtrar_retenidos(jsonb), public.sanear_publico(jsonb), public.publicable(jsonb)
  to service_role;
