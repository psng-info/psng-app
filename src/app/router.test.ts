import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { navigate, parseHash, useHashRoute } from './router';

afterEach(() => {
  window.location.hash = '';
});

describe('parseHash', () => {
  it('nimmt talks als Standard', () => {
    expect(parseHash('')).toEqual({ view: 'talks' });
    expect(parseHash('#/unbekannt')).toEqual({ view: 'talks' });
  });
  it('erkennt todos und kandidaten', () => {
    expect(parseHash('#/todos')).toEqual({ view: 'todos' });
    expect(parseHash('#/kandidaten')).toEqual({ view: 'kandidaten' });
  });
  it('liest die To-do-ID aus #/todos/<id>', () => {
    expect(parseHash('#/todos/T07')).toEqual({ view: 'todos', param: 'T07' });
    expect(parseHash('#/todos/')).toEqual({ view: 'todos' });
    expect(parseHash('#/todos/%E0%A4%A')).toEqual({ view: 'todos' });
  });
  it('dekodiert den Talk-Schlüssel', () => {
    expect(parseHash('#/talks/12.03.2027%20%C2%B7%20Anna')).toEqual({
      view: 'talks',
      param: '12.03.2027 · Anna',
    });
  });
  it('ignoriert kaputte Kodierung', () => {
    expect(parseHash('#/talks/%E0%A4%A')).toEqual({ view: 'talks' });
  });
});

describe('useHashRoute', () => {
  it('folgt navigate()', () => {
    const { result } = renderHook(() => useHashRoute());
    expect(result.current.view).toBe('talks');
    act(() => {
      navigate('talks', 'a b');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current).toEqual({ view: 'talks', param: 'a b' });
    act(() => {
      navigate('todos');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current).toEqual({ view: 'todos' });
  });
});
