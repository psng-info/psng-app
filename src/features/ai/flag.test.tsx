import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiDock } from './Dock';
import { FreeEntryButton } from './FreeEntry';
import { AiProvider } from './AiContext';
import { QueueButton } from './QueueButton';

describe('Schalter VITE_AI aus (Standard)', () => {
  it('zeigt nichts und braucht keine Provider', () => {
    const { container } = render(
      <AiProvider>
        <QueueButton kind="todos" id="T1" label="T1 Test" />
        <FreeEntryButton />
        <AiDock />
      </AiProvider>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(localStorage.getItem('psng.ai.queue.v1')).toBeNull();
  });
});
