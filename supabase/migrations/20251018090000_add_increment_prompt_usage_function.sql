-- Create RPC function for atomic usage increment
create or replace function public.increment_prompt_usage(p_prompt_id uuid)
returns prompt_history
language sql
security invoker
set search_path = public
as $$
  update public.prompt_history
     set usage_count = coalesce(usage_count, 0) + 1,
         last_used_at = now()
   where id = p_prompt_id
   returning prompt_history.*;
$$;

-- Allow authenticated and service role clients to execute the function
grant execute on function public.increment_prompt_usage(uuid) to authenticated;
grant execute on function public.increment_prompt_usage(uuid) to service_role;
