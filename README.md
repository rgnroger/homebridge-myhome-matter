# homebridge-myhome-openwebnet

Plugin Homebridge para instalações BTicino/Legrand MyHome BUS/SCS através do protocolo OpenWebNet.

> Esta é uma versão beta. Luzes, contatos secos 3477 e comandos de cenário CEN+ 4680 foram validados em uma instalação real. Consulte [Estado da validação](#estado-da-validação) antes de usar em produção.

## Recursos

- Luzes e relés com comando e feedback
- Dimmers
- Persianas comuns com estimativa de posição pelo tempo de percurso
- Persianas avançadas com posição absoluta
- Contatos secos BTicino/Legrand 3477, canais 1 a 8
- Comandos de cenário HC/HD/HS/L/N/NT4680 configurados como CEN+
- Toque curto e toque longo nos quatro botões do 4680
- Interface visual de configuração no Homebridge

## Requisitos

- Node.js 18 ou superior
- Homebridge 1.6 ou superior
- Gateway MyHome com OpenWebNet habilitado
- Endereço IP, porta OpenWebNet e senha do gateway

A porta OpenWebNet normalmente utilizada é a **20000**, mas deve corresponder à configuração do seu gateway.

## Instalação

Enquanto o pacote estiver em beta:

```bash
npm install -g homebridge-myhome-openwebnet@beta
```

Depois da instalação, reinicie o Homebridge.

Também é possível instalar pela interface do Homebridge quando o pacote estiver disponível na pesquisa de plugins.

## Configuração

Abra a interface do Homebridge, localize **MyHome OpenWebNet** e selecione **Configurações**.

Informe:

- **IP do gateway MyHome**
- **Porta OpenWebNet**
- **Senha OpenWebNet**, caso configurada
- Os dispositivos que deseja adicionar

As listas começam vazias. Use o botão **Adicionar** da seção correspondente.

### Endereços de iluminação e persianas

Informe separadamente:

- **Ambiente (A)**
- **Ponto (PL)**
- **BUS (B)** — normalmente 0

O plugin converte esses campos para o endereço OpenWebNet no formato `B/A/PL`.

### Persianas comuns

Informe o tempo total aproximado que a persiana leva para abrir ou fechar. Como esse modelo não fornece posição absoluta, o HomeKit/Home Assistant recebe uma posição estimada com base no tempo de percurso.

Use **Inverter subir e descer** se o sentido mostrado não corresponder ao movimento físico.

### Contatos secos 3477

No configurador MyHome, configure o módulo como **Estado do contacto**. No plugin:

1. Adicione um contato seco.
2. Informe um nome.
3. Selecione o canal AUX de 1 a 8.
4. Use **Inverter aberto/fechado** apenas se o estado lógico não corresponder ao contato físico.

### Comandos de cenário 4680 (CEN+)

No configurador MyHome, configure os módulos como **Cenário programado PLUS** e anote o **Número CEN**.

No plugin:

1. Adicione um comando CEN+.
2. Informe o mesmo Número CEN.
3. Defina os nomes de BT1, BT2, BT3 e BT4.
4. Reinicie o Homebridge.

Cada botão é exposto como um comando momentâneo sem estado. São reconhecidos:

- Pressionamento único
- Pressionamento longo

No Home Assistant, esses comandos aparecem como gatilhos de automação, e não como interruptores que permanecem ligados.

## Exemplo mínimo

```json
{
  "name": "MyHome OpenWebNet",
  "host": "192.168.1.10",
  "port": 20000,
  "password": "SUA_SENHA",
  "lights": [
    {
      "name": "Luz da sala",
      "area": 1,
      "point": 1,
      "bus": 0
    }
  ],
  "platform": "MyHomeOpenWebNet"
}
```

Substitua os valores de exemplo pelos dados da sua instalação. Evite publicar seu arquivo de configuração real.

## Home Assistant

A ponte pode ser pareada ao Home Assistant pela integração **HomeKit Device**. Botões CEN+ são acessórios sem estado e devem ser usados como gatilhos de automação do dispositivo.

Uma ponte HomeKit só pode ficar pareada com um controlador de cada vez. Para mover a ponte entre Apple Casa e Home Assistant, primeiro remova o pareamento do controlador atual.

## Estado da validação

| Recurso | Estado |
| --- | --- |
| Luzes e relés | Validado em instalação real |
| Feedback de luzes | Validado em instalação real |
| Contatos secos 3477 | Validado em instalação real |
| CEN+ 4680, BT1–BT4 | Validado em instalação real e Home Assistant |
| Persiana comum | Comando e feedback validados no atuador; motor real ainda pendente |
| Dimmer | Coberto por testes; validação física adicional recomendada |
| Persiana avançada | Coberta por testes; validação física adicional recomendada |
| Medidor de energia | Ainda não implementado/validado nesta versão |

## Diagnóstico

Para confirmar a comunicação com o gateway:

```powershell
Test-NetConnection 192.168.1.10 -Port 20000
```

Substitua o IP pelo endereço do seu gateway.

Se os acessórios não responderem:

- confirme que o gateway responde na rede;
- confirme que a porta OpenWebNet está acessível;
- confira a senha;
- reinicie o Homebridge depois de alterar a configuração;
- consulte o log do Homebridge para verificar os frames e eventos recebidos.

## Desenvolvimento

```bash
npm install
npm test
npm run build
npm pack --dry-run
```

Os testes incluem normalização da configuração, frames OpenWebNet, gateway TCP simulado, feedback para HomeKit e eventos CEN+.

## Créditos

O núcleo OpenWebNet deste projeto foi desenvolvido a partir do trabalho do projeto `homebridge-myhome-hb2`.

## Licença

[MIT](LICENSE)
