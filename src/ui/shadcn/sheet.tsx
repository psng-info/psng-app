import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/ui/lib/utils';

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn('fixed inset-0 z-50 bg-black/50', className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'bottom',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  // Die Sheets werden per State geöffnet, nicht über einen Radix-Trigger. Damit der Fokus beim
  // Schließen zurückkehrt, merken wir uns das Element, das beim Öffnen den Fokus hatte.
  const opener = React.useRef<HTMLElement | null>(null);
  const { onOpenAutoFocus, onCloseAutoFocus } = props;
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(
          'bg-card text-card-foreground fixed z-50 flex flex-col gap-4 p-4 shadow-lg',
          side === 'right' && 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-border',
          side === 'left' && 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-border',
          side === 'top' && 'inset-x-0 top-0 max-h-[85dvh] border-b border-border',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-lg border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))]',
          className,
        )}
        {...props}
        onOpenAutoFocus={(e) => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          onOpenAutoFocus?.(e);
        }}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e);
          if (e.defaultPrevented) return;
          const el = opener.current;
          if (el?.isConnected) {
            e.preventDefault();
            el.focus();
          }
        }}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-2 right-2 inline-flex size-11 items-center justify-center rounded-md hover:bg-secondary">
          <XIcon className="size-4" />
          <span className="sr-only">Schließen</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  // Klebt am unteren Rand des scrollenden Sheets, damit Speichern/Abbrechen immer erreichbar bleiben.
  // Der negative Rand gleicht das Padding von SheetContent (Safe Area) aus.
  return (
    <div
      className={cn(
        'border-border bg-card sticky bottom-0 z-10 mt-auto -mb-[max(1rem,env(safe-area-inset-bottom))] -mx-4 flex flex-row-reverse gap-2 border-t px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:flex-1',
        className,
      )}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn('font-display text-lg font-semibold', className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
