# Alterações

## 1.1.0-beta.9 — retorno HomeKit e interface

- Respostas às consultas OpenWebNet na conexão de comandos agora são processadas em vez de descartadas.
- Relés consultam o estado físico depois de comandos HomeKit ou Matter e publicam eventos diretamente no HAP.
- Estado inicial de todos os relés é consultado ao conectar, incluindo acessórios sem pulso.
- Contatos, contatos secos, AUX, cenários e dimmers publicam mudanças diretamente no HomeKit.
- Removida a janela de reinício do configurador; o salvamento voltou a orientar o reinício pelo painel.
- Botões, campos e cartões receberam cantos mais arredondados.

## 1.1.0-beta.8 — confirmação de reinício e sincronização

- Depois de salvar, o configurador oferece `Reiniciar agora` ou `Depois` na própria janela.
- O reinício só é solicitado depois que a validação e a gravação terminam com sucesso.
- Comandos HomeKit não atualizam novamente a mesma característica durante a requisição HAP.
- Comandos Matter pedem o estado real do relé ao gateway após o acionamento.
- Arquivos da tela usam a versão no endereço para evitar JavaScript antigo em cache.

## 1.1.0-beta.7 — publicação npm

- Publicado como `homebridge-myhome-matter`, separado do pacote original.
- Metadados de suporte HomeKit e Matter adicionados ao catálogo.

## 1.1.0-beta.6 — instalação limpa

- Identificação da plataforma HomeKit corrigida de `homebridge-myhome` para o nome real do pacote, `homebridge-myhome-hb2`.
- Inicialização sem gateway/dispositivos aguarda cadastro, sem abrir conexões ou falhar por campos ausentes; porta padrão 20000 aplicada também no código.
- Validação antes de iniciar o cliente: tipos desconhecidos, endereços individuais duplicados, porta e tempo de persiana. Rejeita múltiplas plataformas Matter ao salvar.
- Cadastro visual de persianas comuns e avançadas; tempo de percurso obrigatório nas comuns. Matter permanece limitado a relés.
- Salvamento desacoplado de `hb-service restart`: funciona independentemente do gerenciador de serviços; reinício pelo painel Homebridge após salvar.
- Exemplo inicial vazio, sem credenciais, identidade de ponte ou acessórios antigos; README e configurador reescritos para o novo local, incluindo Docker e instalação global.
- Node suportado: 22/24; Homebridge: 1.11 para HomeKit e 2.4+ da série 2 para HomeKit/Matter.
- Removida dependência npm `net` (módulo nativo do Node); `debug` atualizado à série 4; lockfile incluído. Homebridge usado somente como dependência de desenvolvimento para testes.
- Testes de primeira configuração, persistência, validação de persianas e carregamento das APIs reais Homebridge, sem conectar a equipamento. Fluxo de testes automatizados em Node 22/24.

Comparação: upstream `miobio/homebridge-myhome-hb2` em `f512641dd6455fe46ca0259100686abfd080f932`; fork inicial em `b5bf86b`, 14 commits à frente, nenhum commit original pendente. A camada de transporte OpenWebNet não foi reescrita. O teste físico pertence ao novo local; validações anteriores não confirmam a instalação nova.
