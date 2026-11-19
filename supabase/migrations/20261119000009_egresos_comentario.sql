-- Egresos: el campo "proveedor" pasa a ser "comentario" (opcional, texto libre)
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'boxing_gym' and table_name = 'expenses' and column_name = 'supplier') then
    alter table boxing_gym.expenses rename column supplier to comment;
  end if;
end $$;

-- Refresca el caché de esquema de la API (PostgREST)
notify pgrst, 'reload schema';
