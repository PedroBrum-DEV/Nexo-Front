# Identidade visual: azul-mar, branco e dourado (modo claro)

Os valores estão em `tokens.css` (CSS) e `tokens.json` (Tailwind/React). Nada de cor solta no código: sempre use o token.

## Regras de uso

1. **Azul-mar é a cor de ação.** Botão principal, link, foco, item de menu ativo. Um único botão primário por tela.
2. **Dourado é destaque, não texto.** Use como preenchimento (cartão, selo, sublinhado) com texto `--color-on-gold`. Dourado como cor de texto sobre branco não passa no contraste.
3. **Dourado significa "olhe aqui":** conversa aguardando atendente humano, alertas, itens que precisam de ação. Não use para decoração em excesso.
4. **Selos de conversa:** "IA atendendo" = `primary-soft` + `primary-deep`; "Aguardando você" = `gold-soft` + `gold-deep`; "Resolvida" = `line` + `muted`.
5. **Verde e vermelho só para sucesso e erro**, nunca como cor de marca.
6. Texto sempre `--color-ink` ou `--color-muted`. Nunca preto puro.
7. Alvos de toque no mobile com no mínimo 44 px. Foco visível com `--color-focus`.
8. Fonte Manrope (400, 600, 700, 800).

## Contraste verificado (WCAG AA, mínimo 4,5:1 para texto)

| Par | Razão aproximada |
|---|---|
| ink sobre branco | 14:1 |
| muted sobre branco | 5,6:1 |
| branco sobre primary | 7,2:1 |
| primary-deep sobre primary-soft | 8:1 |
| on-gold sobre gold | 7,4:1 |
| gold-deep sobre gold-soft | 7:1 |

## Como usar no React / Tailwind

```css
/* importe uma vez na raiz */
@import "./tokens.css";
```

```js
// tailwind.config.js
import tokens from './design/tokens.json' assert { type: 'json' };
export default {
  theme: { extend: { colors: { brand: tokens.color }, fontFamily: { sans: [tokens.font.sans, 'system-ui', 'sans-serif'] } } },
};
```

Exemplo: `bg-brand-primary text-brand-onPrimary`, `bg-brand-goldSoft text-brand-goldDeep`.
