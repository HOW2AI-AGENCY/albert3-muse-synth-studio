-- Функция для автоматического обновления счетчика лайков в таблице tracks
CREATE OR REPLACE FUNCTION update_track_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tracks 
    SET like_count = like_count + 1 
    WHERE id = NEW.track_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tracks 
    SET like_count = like_count - 1 
    WHERE id = OLD.track_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Триггер на таблицу track_likes для автоматического обновления счетчика
CREATE TRIGGER track_likes_count_trigger
AFTER INSERT OR DELETE ON track_likes
FOR EACH ROW EXECUTE FUNCTION update_track_likes_count();