# AutoGest - Sistema de Gestão de Veículos

Sistema completo para gestão de lojas de veículos com controle de estoque, gastos, vendas e dashboard analítico.

## 🎯 Funcionalidades Implementadas

### 1. **Autenticação & Segurança**
- Login seguro com CPF e senha para lojistas
- Painel admin exclusivo (kaique.freire@hotmail.com)
- Senhas criptografadas com bcryptjs
- JWT para sessões seguras
- Middleware protegendo rotas

### 2. **Painel do Admin**
- Cadastro de novas lojas (CPF, nome, senha)
- Edição e exclusão de lojas
- Ativação/desativação de lojas
- Isolamento multi-tenant de dados

### 3. **Gestão de Veículos (Página Gastos)**
- **CRUD completo de veículos:**
  - Adicionar: placa, marca, modelo, versão, ano fabricação, ano modelo, valor compra, RENAVAN, chassis
  - Editar detalhes do veículo
  - Excluir veículo
  - Marcar como "VENDIDO" (com valor de venda)
  - Acessar página de gastos específicos

### 4. **Gastos por Veículo**
- Registrar despesas individuais (descrição, valor, data)
- Visualizar total de gastos por veículo
- Excluir despesas
- Cálculo automático de gastos totais

### 5. **Página de Vendidos**
- Listagem de todos os veículos vendidos
- Resumo de lucros/perdas
- Análise de margem de lucro (%)
- Estatísticas financeiras

### 6. **Dashboard Analytics**
- Estatísticas principais (total veículos, em estoque, vendidos)
- Gráfico de veículos por status (Pizza)
- Gráfico de gastos mensais (Barras)
- Dados em tempo real

### 7. **Tema Visual**
- Dark mode / Light mode com toggle
- Tema automotivo profissional
- Cores: Azul principal com acentos
- Interface responsiva (mobile-friendly)

## 🔐 Credenciais de Acesso

### Admin
- **Email:** kaique.freire@hotmail.com
- **Senha:** Kaique1020*

### Como criar uma loja
1. Faça login como admin
2. Clique em "Adicionar Loja"
3. Preencha: CPF, Nome da Loja, Senha
4. A loja poderá fazer login com seu CPF + senha

## 💾 Estrutura do Banco de Dados

### Tabelas Principais
- **admins** - Usuários administradores
- **stores** - Lojas cadastradas (isolamento multi-tenant)
- **vehicles** - Veículos (carros/motos)
- **vehicle_expenses** - Despesas por veículo

Cada loja acessa apenas seus próprios dados através do `store_id`.

## 🚀 Como Usar

### Instalação
```bash
npm install
# ou
pnpm install
```

### Variáveis de Ambiente
Copie `.env.example` para `.env.local` e configure:
```
DATABASE_URL=sua_url_neon
JWT_SECRET=sua_chave_secreta
```

### Desenvolvimento
```bash
npm run dev
```
Acesse em `http://localhost:3000`

## 📱 Fluxo de Usuário

### Lojista
1. Login com CPF + senha
2. Dashboard com resumo
3. Página de Gastos para gerenciar veículos
4. Clique em "Gastos" para ver despesas de um veículo
5. Marque como "Vendido" quando vender
6. Acompanhe vendas na página Vendidos

### Admin
1. Login com email + senha
2. Crie/edite/delete lojas
3. Cada loja terá acesso isolado

## 🎨 Stack Técnico

- **Framework:** Next.js 16 (App Router)
- **Banco:** Neon PostgreSQL
- **Autenticação:** JWT + bcryptjs
- **UI:** shadcn/ui + Tailwind CSS
- **Gráficos:** Recharts
- **Estado:** SWR (client-side)
- **Validação:** Zod

## 🔄 Fluxo de Dados

```
Login → JWT Token (httpOnly cookie) → Middleware verifica token
  ↓
API Routes (verificam token, isolam por store_id)
  ↓
Banco de Dados (Neon) → Retorna dados isolados por loja
  ↓
Cliente renderiza componentes com dados
```

## 📊 Próximos Passos Opcionais

- Relatórios em PDF exportáveis
- Notificações de manutenção
- Histórico de preços
- Integração com foto de veículos
- SMS/Email de confirmação
- Backup automático

---

**Sistema criado com TypeScript + Next.js 16 | v0.app**
