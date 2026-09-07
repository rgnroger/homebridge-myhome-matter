# MyHome Matter

Fork de [miobio/homebridge-myhome-hb2](https://github.com/miobio/homebridge-myhome-hb2), com tela de configuração para Homebridge e publicação opcional de relés via Matter.

## O que está disponível

- Cadastro de luzes pela tela, com **A** (área) e **PL** (ponto de luz) separados. Área **0** aceita; barramento nas opções avançadas.
- Tipos **Relé liga/desliga** e **Dimmer**. Dimmers controlam brilho pelo HomeKit; Matter está implementado apenas para MHRelay.
- Seleção de vários relés Matter, preservando HAP/HomeKit.
- Editor JSON e preservação dos campos avançados existentes.
- Remoção de acessórios Matter desmarcados após salvar e reiniciar.

## Estado da beta

Versão **1.1.0-beta.3**. O controle físico de um MHRelay pela Alexa foi validado com Homebridge 2.4.0. A tela carrega a configuração real, adiciona novos dispositivos no topo e usa botões diretos para escolher relé ou dimmer.

Matter exige suporte e configuração Matter no Homebridge. O gateway e a plataforma complementar devem estar no mesmo processo. O transporte OpenWebNet mantém o comportamento otimista do original: enviar/enfileirar um comando não confirma execução física.

## Instalação

O nome npm **homebridge-myhome-hb2** é mantido para substituir a versão instalada, sem criar um segundo plugin. Este fork não está publicado no npm. Instale o arquivo .tgz da versão ou este repositório no diretório real da instalação existente:

```sh
npm install github:rgnroger/homebridge-myhome-matter
```

Faça backup antes de atualizar. Na instalação Docker em que /var/lib/homebridge é um link para /homebridge, entre em **/homebridge** antes de instalar. Não mantenha duas cópias do plugin.

Consulte [CONFIGURADOR.md](CONFIGURADOR.md) para configuração, exemplo JSON e instalação de pacote local. Trocar o tipo de um dispositivo existente de relé para dimmer altera seu tipo/identidade HAP; prefira cadastrar o tipo correto desde o início.

## Testes

```sh
npm test
npm run check
```

Os testes de lógica usam APIs simuladas, sem acionar dispositivos. Não há etapa de compilação: o plugin é JavaScript.

## Créditos e licença

Mantido sob a [licença MIT](LICENSE), com os avisos originais de angeloxx, Simone Tisa e LeJeko. Base modernizada por miobio; melhorias de configuração e Matter neste fork de rgnroger. O projeto [bvial/homebridge-myhome](https://github.com/bvial/homebridge-myhome) foi referência para a experiência de configuração; nenhum código dele foi incorporado.

Projeto independente, sem afiliação oficial com BTicino, Legrand, Amazon ou Apple.
