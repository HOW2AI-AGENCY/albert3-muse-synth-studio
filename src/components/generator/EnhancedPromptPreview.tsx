import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Edit2, Zap, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedPromptPreviewProps {
  original: string;
  enhanced: string;
  addedElements: string[];
  reasoning: string;
  onAccept: (finalPrompt: string) => void;
  onReject: () => void;
  isLoading?: boolean;
}

const getCategoryIcon = (element: string) => {
  const lower = element.toLowerCase();
  if (lower.includes('bpm') || lower.includes('tempo')) return '🎵';
  if (lower.includes('bass') || lower.includes('drum') || lower.includes('guitar')) return '🎸';
  if (lower.includes('structure') || lower.includes('verse') || lower.includes('chorus')) return '🎼';
  if (lower.includes('key') || lower.includes('minor') || lower.includes('major')) return '🎹';
  return '⚡';
};

export const EnhancedPromptPreview: React.FC<EnhancedPromptPreviewProps> = ({
  original,
  enhanced,
  addedElements,
  reasoning,
  onAccept,
  onReject,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(enhanced);

  const handleAccept = () => {
    const finalPrompt = isEditing ? editedPrompt : enhanced;
    onAccept(finalPrompt);
    
    // Save user preference
    localStorage.setItem('ai-enhance-auto-accept', 'true');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPrompt(enhanced);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">AI улучшил ваш промпт</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {reasoning}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Added Elements */}
            {addedElements.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Добавлено:</p>
                <div className="flex flex-wrap gap-1.5">
                  {addedElements.map((element, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5"
                    >
                      <span className="mr-1">{getCategoryIcon(element)}</span>
                      {element}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Prompt */}
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    className="min-h-[100px] text-sm"
                    placeholder="Отредактируйте улучшенный промпт..."
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Отменить
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <p className="text-sm p-3 rounded-lg bg-muted/50 border">
                    {enhanced}
                  </p>
                </div>
              )}
            </div>

            {/* Diff View */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="diff" className="border-none">
                <AccordionTrigger className="text-xs py-2 hover:no-underline">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Сравнить с оригиналом
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Оригинал:</p>
                      <p className="text-xs p-2 rounded bg-muted/30 text-muted-foreground line-through">
                        {original}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleAccept}
                disabled={isLoading}
                className="flex-1"
                size="sm"
              >
                <Check className="h-4 w-4 mr-1.5" />
                Использовать улучшенный
              </Button>
              
              {!isEditing && (
                <Button 
                  onClick={handleEdit}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              
              <Button 
                onClick={onReject}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Tip */}
            <p className="text-xs text-muted-foreground text-center pt-1">
              💡 Улучшения будут применяться автоматически в будущем
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
