import { extractMentionHandles } from './comments.service';

describe('extractMentionHandles', () => {
  it('retorna vazio quando não há menções', () => {
    expect(extractMentionHandles('texto sem menções aqui')).toEqual([]);
  });

  it('extrai menção simples', () => {
    expect(extractMentionHandles('Olá @joao, pode ver?')).toEqual(['joao']);
  });

  it('extrai múltiplas menções únicas', () => {
    expect(extractMentionHandles('Eu @joao chamei o @maria_silva. Também @joao.')).toEqual([
      'joao',
      'maria_silva',
    ]);
  });

  it('ignora @ dentro de email', () => {
    // pattern exige início de string ou whitespace antes do @
    expect(extractMentionHandles('email: joao@kharis.com')).toEqual([]);
  });

  it('aceita menção no início do texto', () => {
    expect(extractMentionHandles('@admin veja isto')).toEqual(['admin']);
  });

  it('normaliza pra minúsculas', () => {
    expect(extractMentionHandles('@JOAO e @Maria')).toEqual(['joao', 'maria']);
  });
});
