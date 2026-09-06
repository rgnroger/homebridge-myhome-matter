# Teste Matter: EMBUTIDO 1

Versão local: `1.0.1-matter-test.1`. Base: miobio/homebridge-myhome-hb2, commit `f512641` (arquivo obtido do GitHub). API conferida nas fontes da tag Homebridge `v2.4.0`, commit abreviado `ab1e8c4`.

## O que foi alterado

- `index.js`: registra uma plataforma complementar, compartilha a instância existente do gateway, centraliza o comando do MHRelay e encaminha mudanças do monitor para Matter. Os UUIDs HAP, serviços, nome da plataforma original e configuração dos dispositivos permanecem iguais.
- `lib/matter-relay.js`: plataforma dinâmica `LegrandMyHomeMatter`, limitada a exatamente um MHRelay. Usa `api.matter.deviceTypes.OnOffLight`, que o Homebridge mapeia para `OnOffLightDevice` do matter.js; cluster `onOff` e handlers `on`, `off`, `toggle`. Não instala outra cópia do matter.js.
- `package.json`: versão de teste, palavra-chave `supports-matter` e scripts de verificação.
- `test/matter-relay.test.js`: cinco testes sem conexão ao gateway.

Não basta acrescentar `configureAccessory` à plataforma original: o Homebridge passaria a classificá-la como dinâmica e deixaria de chamar `accessories(callback)`, interrompendo a publicação HAP. A plataforma complementar resolve também a associação do cache Matter, cuja restauração procura plataformas dinâmicas.

## Instalação

1. Faça um backup pela interface do Homebridge e guarde a configuração atual. Anote a versão instalada do plugin.
2. Transfira `homebridge-myhome-hb2-1.0.1-matter-test.1.tgz` para a máquina/container do Homebridge, por exemplo `/tmp/`.
3. No terminal desse Homebridge, identifique onde o plugin atual está instalado. `npm list --prefix /var/lib/homebridge homebridge-myhome-hb2` verifica a instalação local comum; `npm list -g homebridge-myhome-hb2` verifica a global. Use somente o local que contém o plugin atual, para não criar duas instalações.
4. Pare o Homebridge pelo mecanismo de serviço usado na sua instalação. Instale no mesmo destino. Para instalação local em `/var/lib/homebridge`:

   ```sh
   npm install --prefix /var/lib/homebridge /tmp/homebridge-myhome-hb2-1.0.1-matter-test.1.tgz
   ```

   Para instalação global confirmada pelo comando anterior:

   ```sh
   npm install -g /tmp/homebridge-myhome-hb2-1.0.1-matter-test.1.tgz
   ```

   Se o destino local for outro, substitua o prefixo. Use a conta/permissões habituais da instalação. Não execute ambos os comandos. O nome npm continua igual, portanto a instalação substitui a versão do mesmo pacote.
5. Preserve o objeto `LegrandMyHome` atual inteiro e acrescente este segundo objeto ao array `platforms` do `config.json`:

   ```json
   {
     "platform": "LegrandMyHomeMatter",
     "name": "MyHome Matter Test",
     "address": "0/0/3",
     "enabled": true
   }
   ```

   O dispositivo `MHRelay` de endereço `0/0/3` já deve existir em `devices` da plataforma original. O nome publicado será o nome existente, esperado `EMBUTIDO 1`. Não duplique esse dispositivo. Se houver mais de um gateway com esse endereço, adicione `ipaddress` ao novo objeto com o IP do gateway desejado.
6. **As duas plataformas precisam estar no mesmo processo.** A configuração mais simples é ambas na ponte principal, com Matter habilitado nessa ponte. Se `LegrandMyHome` estiver isolada em uma child bridge e a complementar em outra, o teste não encontrará o relé. Não migre uma child bridge já pareada sem avaliar o impacto nos acessórios HomeKit; esta versão ainda não compartilha o gateway entre processos.
7. Inicie o Homebridge e confirme a versão de teste no log. Não é necessário apagar pareamentos, persistência ou caches.

## Log e Alexa

- Espere `[Matter test] Registered EMBUTIDO 1 (0/0/3) as OnOffLight` após o início. Confirma o registro na API; não prova descoberta pela Alexa nem execução física.
- `Matter is disabled on this bridge`: habilite Matter na ponte/processo que carrega as duas plataformas.
- `No relay published`: confira tipo `MHRelay`, endereço, unicidade, `enabled` e processo compartilhado.
- `Startup failed` ou `State update failed`: guarde a mensagem completa e a versão Homebridge/Node para diagnóstico.
- Na Alexa, verifique se aparece uma luz chamada `EMBUTIDO 1` entre os dispositivos da ponte Matter já adicionada. Aguarde a atualização/descoberta. Se ainda não pareou essa ponte, use o código **Matter** mostrado pelo Homebridge. O PIN HomeKit não serve para Matter.
- Ligue e desligue pela Alexa: espere `[Matter test] Command ON -> 0/0/3` e `OFF`, e confira a luz física e o estado no app Casa.
- Acione pelo app Casa e pelo interruptor físico: confira a atualização na Alexa. O teste consulta o estado na inicialização, e usa os eventos do monitor existente para as mudanças posteriores.
- Reinicie o Homebridge: o mesmo UUID deve ser reutilizado, sem uma segunda luz Matter. Confira novamente comandos e sincronização.
- Confirme que os outros acessórios HomeKit continuam acessíveis. Nenhum dimmer, persiana ou outro relé é publicado por esta etapa.

## Limitações e reversão

Testes automatizados usam a API simulada e os métodos reais de MHRelay/onRelay, sem rede. Cinco testes passaram em Node 24.19.0, além da checagem de sintaxe de `index.js` e `lib/matter-relay.js`. O projeto original não tinha lint, build ou suíte de testes. Não foi executado um Homebridge real nem um endpoint matter.js neste computador; Alexa, gateway e reinício real ainda precisam de validação.

O transporte original não retorna confirmação de execução física: tanto HAP quanto Matter assumem sucesso ao enfileirar o comando, e o monitor corrige o estado posteriormente. Frames personalizados continuam sendo respeitados. O estado inicial é o estado disponível em memória (pode começar desligado até chegar a resposta do gateway). O endereço e IP do gateway participam do UUID Matter; alterá-los cria outra identidade. O nome pode mudar sem mudar o UUID.

Use apenas uma instância `LegrandMyHomeMatter` neste teste. Para desativar, mantenha a plataforma complementar com `enabled: false` e reinicie uma vez com Matter ativo: ela remove seus acessórios Matter do cache. Depois remova o objeto complementar e reinstale a versão anterior pelo mesmo destino usado na instalação. O backup é a referência para restauração da configuração; não apague os caches HAP.

## Fontes consultadas

- https://github.com/miobio/homebridge-myhome-hb2/tree/f512641
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/api.ts
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/server.ts
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/matter/BaseMatterManager.ts
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/matter/types.ts
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/matter/clusterHandlerMap.ts
- https://github.com/homebridge/homebridge/blob/v2.4.0/src/matter/behaviors/OnOffBehavior.ts
