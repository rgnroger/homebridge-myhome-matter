# Configurador MyHome — 1.1.0-beta.1

Esta versão adiciona uma tela ao botão de configurações do plugin no Homebridge. O suporte Matter permite selecionar vários relés MHRelay existentes ou novos, incluindo a área zero. O nome npm continua `homebridge-myhome-hb2` para permitir atualizar a instalação atual sem duplicar plugins. Distribuição pelo fork rgnroger/homebridge-myhome-matter no GitHub. Não publicada no npm.

## Pela tela

1. Abra as configurações do plugin.
2. Selecione o gateway e confira IP, porta e senha.
3. Clique em **Adicionar luz** e escolha **Relé liga/desliga** ou **Dimmer**. Preencha nome, **A** (área) e **PL** (ponto de luz). Por exemplo, A = 0 e PL = 9 para um abajur. O barramento começa em 0 e pode ser alterado em Avançado.
4. Marque **Publicar também no Matter** nos relés desejados.
5. Clique em **Salvar configuração** e reinicie o Homebridge.

Área zero é aceita: `0/0/3` representa barramento 0, área 0, ponto 3. O ponto deve ser maior que zero: esta etapa publica atuadores individuais, não comandos gerais. Endereços repetidos no mesmo gateway são recusados. Não alteramos o formato nem o UUID HAP de dispositivos existentes.

Desmarcar Matter mantém o relé no HomeKit. Remover uma linha exclui o dispositivo da configuração de ambos os protocolos após salvar/reiniciar. A plataforma Matter complementar é mantida mesmo sem relés selecionados para que o cache antigo seja limpo pelo Homebridge.

Os outros tipos existentes continuam visíveis e conservam seus campos avançados. Nesta etapa a tela cria relés e dimmers. Dimmers controlam brilho pelo HomeKit; Matter permanece disponível somente para MHRelay. Dispositivos de outros tipos e opções específicas continuam editáveis em **JSON avançado**. Não há escolha “somente Matter”: HomeKit permanece ativo.

## Pelo JSON

Na plataforma original, cada relé pode ter `matter: true`:

```json
{
  "platform": "LegrandMyHome",
  "name": "MyHome",
  "ipaddress": "192.168.1.35",
  "port": 20000,
  "devices": [
    { "accessory": "MHRelay", "name": "EMBUTIDO 1", "address": "0/0/3", "matter": true },
    { "accessory": "MHRelay", "name": "Abajur", "address": "0/0/9", "matter": true }
  ]
}
```

Adicione ao mesmo array `platforms` o objeto complementar (a tela cuida disso automaticamente):

```json
{ "platform": "LegrandMyHomeMatter", "name": "MyHome Matter", "mode": "configured", "enabled": true }
```

Mantenha somente uma plataforma complementar. Ela e os gateways selecionados precisam estar no mesmo processo, com Matter habilitado. A tela bloqueia selecionar Matter em uma child bridge para não mover silenciosamente acessórios já pareados. Ela não altera a configuração de rede ou o pareamento Matter.

Configurações antigas com `address: "0/0/3"` na plataforma complementar ainda funcionam. Ao salvar pela tela, essa seleção vira `matter: true` no dispositivo correspondente. O UUID Matter continua derivado do mesmo gateway, porta e endereço, então essa migração conserva a identidade. Apenas abrir a tela não grava nem migra o arquivo ativo.

## Instalação de teste no Docker já utilizado

Faça backup antes. Transfira o novo arquivo `.tgz` para a pasta persistente do Homebridge pelo CasaOS. Na instalação verificada, `/var/lib/homebridge` aponta para `/homebridge`; use o caminho real para o npm não gravar uma referência relativa inválida:

```sh
cd /homebridge
npm install ./homebridge-myhome-hb2-1.1.0-beta.1.tgz --no-audit --no-fund
```

Reinicie o Homebridge e abra as configurações do plugin. Não instale globalmente em paralelo. Em outra instalação, use o diretório real que já contém o `package.json` e o plugin atual.

## Validação

- Testes automatizados: seleção independente de vários relés, isolamento de comandos/estados, área zero, duplicatas, migração de configuração, preservação de campos avançados, retirada do cache, falha isolada de registro e encerramento.
- Tela verificada em demonstração local com a API da interface simulada: adicionar abajur `0/0/9`, marcar Matter, salvar, conferir JSON, bloquear duplicata e remover.
- A versão anterior `1.0.1-matter-test.1` foi validada pelo usuário com um relé físico e Alexa. Esta beta ainda precisa ser instalada para validar a integração da tela com o Homebridge real e vários atuadores reais.

O cliente OpenWebNet continua otimista: enfileirar um comando não é confirmação física. Eventos do monitor atualizam o estado posterior. Dimmers e persianas ainda não são publicados em Matter.

## Origem

Base: miobio/homebridge-myhome-hb2 (`f512641`), preservando os avisos MIT em LICENSE. O projeto bvial/homebridge-myhome serviu como referência de experiência de configuração; nenhum código dele foi incorporado. A tela usa a API documentada em https://github.com/homebridge/plugin-ui-utils e a implementação Matter usa a API Homebridge 2.4.0.
