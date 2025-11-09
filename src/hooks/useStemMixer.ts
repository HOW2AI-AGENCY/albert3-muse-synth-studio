// Реэкспорт хука из актуального расположения контекста стем-миксера
// Исправление: ранее указывался путь '@/contexts/StemMixerContext', который не содержит экспорт useStemMixer
// Теперь путь указывает на модуль '@/contexts/stem-mixer/useStemMixer', где хук определён
export { useStemMixer } from '@/contexts/stem-mixer/useStemMixer';