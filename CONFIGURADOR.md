# Configurador — 1.1.0-beta.5

Siga a [instalação limpa](README.md). O cadastro começa com gateway vazio e nenhum dispositivo. Informe os dados OpenWebNet do novo local: IP/hostname, porta (padrão 20000) e senha. Os endereços não são descobertos automaticamente.

**A** é área, **PL** é ponto; o barramento fica em Avançado. `0/0/3` representa barramento 0, área 0, ponto 3. Para persiana comum (`MHBlind`), informe `time`, o tempo de percurso completo em segundos. Persiana avançada (`MHBlindAdvanced`) requer atuador com suporte a posição.

Clique em **Salvar configuração**, feche a tela e reinicie pelo painel Homebridge. O salvamento cria backup e rejeita alterações concorrentes detectadas; se houver conflito, reabra o editor.

## Exemplo HomeKit

Adicione este objeto ao array `platforms`; não substitua o arquivo inteiro. IP reservado para documentação: substitua IP, senha, endereços e tempo antes de usar.

```json
{
  "platform": "LegrandMyHome",
  "name": "MyHome novo local",
  "ipaddress": "192.0.2.10",
  "port": 20000,
  "ownpassword": "SENHA_DO_NOVO_GATEWAY",
  "setclock": false,
  "devices": [
    { "accessory": "MHRelay", "name": "Luz", "address": "0/0/3", "matter": false },
    { "accessory": "MHDimmer", "name": "Dimmer", "address": "0/1/2" },
    { "accessory": "MHBlind", "name": "Persiana", "address": "0/2/1", "time": 28 }
  ]
}
```

28 segundos é apenas exemplo: meça no equipamento. `setclock: false` evita ajustar o relógio do gateway ao iniciar.

## Matter opcional

No Homebridge 2.4+ da série 2, habilite Matter no próprio Homebridge e marque os relés na tela. Pelo JSON, use `matter: true` no `MHRelay` e acrescente ao mesmo array `platforms`:

```json
{ "platform": "LegrandMyHomeMatter", "name": "MyHome Matter", "mode": "configured", "enabled": true }
```

Use apenas uma plataforma complementar. Ela e o gateway devem ficar na ponte principal, no mesmo processo. A tela não configura a rede Matter nem pareia controladores. No Homebridge 1.11, use somente HomeKit. Dimmers e persianas não têm Matter nesta versão.

Desmarcar Matter mantém HomeKit. A plataforma complementar permanece para limpar acessórios Matter antigos após reiniciar.

## Tipos legados e diagnóstico

Outros tipos e opções específicas permanecem no JSON avançado. Campos avançados são preservados. Relés e persianas podem compartilhar A/PL porque usam famílias OpenWebNet distintas. Evite duplicatas da mesma família no mesmo gateway.

- Plugin ausente: confira o diretório de instalação, reinicie e procure `homebridge-myhome-hb2` nos registros.
- Sem conexão: confira IP, porta, rede, firewall e autorização OpenWebNet.
- Autenticação falhou: confira a senha OpenWebNet; pode diferir da senha de administração.
- Sem acionamento: confira tipo e A/PL/barramento; teste primeiro um dispositivo.
- Sem Matter: confira versão, Matter habilitado, relé selecionado e as plataformas no mesmo processo.

Testes locais não confirmam funcionamento físico no novo local.
