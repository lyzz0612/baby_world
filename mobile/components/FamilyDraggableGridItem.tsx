import { useCallback, useRef, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import type { LayoutRect } from '@/src/utils/familyGridReorder';

type Props = {
  itemId: string;
  dragEnabled: boolean;
  isDragging: boolean;
  onMeasure: (id: string, rect: LayoutRect) => void;
  onDragStart: (id: string, rect: LayoutRect) => void;
  onDragMove: (translationX: number, translationY: number) => void;
  onDragEnd: (absoluteX: number, absoluteY: number) => void;
  children: ReactNode;
};

export function FamilyDraggableGridItem({
  itemId,
  dragEnabled,
  isDragging,
  onMeasure,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: Props) {
  const containerRef = useRef<View>(null);

  const measureItem = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      const rect = { x, y, width, height };
      onMeasure(itemId, rect);
    });
  }, [itemId, onMeasure]);

  const startDrag = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) return;
      const rect = { x, y, width, height };
      onMeasure(itemId, rect);
      onDragStart(itemId, rect);
    });
  }, [itemId, onDragStart, onMeasure]);

  const panGesture = Gesture.Pan()
    .enabled(dragEnabled)
    .activateAfterLongPress(420)
    .onStart(() => {
      runOnJS(startDrag)();
    })
    .onUpdate((event) => {
      runOnJS(onDragMove)(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      runOnJS(onDragEnd)(event.absoluteX, event.absoluteY);
    });

  const onLayout = (_event: LayoutChangeEvent) => {
    measureItem();
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        ref={containerRef}
        onLayout={onLayout}
        style={isDragging ? { opacity: 0.28 } : undefined}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
