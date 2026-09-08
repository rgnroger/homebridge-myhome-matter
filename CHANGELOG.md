# Alterações

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
