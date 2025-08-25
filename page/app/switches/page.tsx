"use client";

import { useState } from "react";
import {
  DarkModeSwitch,
  DarkModeSwitchWithText,
  CompactDarkModeSwitch,
  DarkModeToggleSwitch,
} from "@/components/dark-mode-switch";
import { ThemeToggle, SimpleThemeToggle } from "@/components/theme-toggle";
import {
  DashboardHeader,
  SimpleDashboardHeader,
  MinimalDashboardHeader,
} from "@/components/dashboard-header";
import { useTheme } from "@/hooks/use-theme";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Palette, Zap } from "lucide-react";

export default function SwitchesPage() {
  const { theme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("buttons");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Botões Dark Mode"
        subtitle="Todos os tipos de switches para alternar entre modo claro e escuro"
        switchType="dropdown"
      />

      <div className="container max-w-screen-2xl px-4 py-6">
        {/* Status atual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Status do Tema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge
                variant={resolvedTheme === "dark" ? "default" : "secondary"}
              >
                Atual: {resolvedTheme}
              </Badge>
              <Badge variant="outline">Configurado: {theme}</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="buttons">Botões Simples</TabsTrigger>
            <TabsTrigger value="advanced">Avançados</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="code">Código</TabsTrigger>
          </TabsList>

          <TabsContent value="buttons" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Botão Básico */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Botão Básico (Recomendado)
                  </CardTitle>
                  <CardDescription>
                    Switch simples apenas com ícone, ideal para headers e barras
                    de navegação
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch />
                    <span className="text-sm text-muted-foreground">
                      Padrão
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch variant="default" />
                    <span className="text-sm text-muted-foreground">
                      Filled
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch variant="ghost" />
                    <span className="text-sm text-muted-foreground">Ghost</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch variant="secondary" />
                    <span className="text-sm text-muted-foreground">
                      Secondary
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Botão com Texto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Botão com Texto</CardTitle>
                  <CardDescription>
                    Switch que mostra o texto do modo atual, ideal para settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DarkModeSwitchWithText />
                    <span className="text-sm text-muted-foreground">
                      Padrão
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch showText size="default" />
                    <span className="text-sm text-muted-foreground">
                      Outline com texto
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch showText variant="default" size="default" />
                    <span className="text-sm text-muted-foreground">
                      Filled com texto
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Botão Compacto */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Botão Compacto</CardTitle>
                  <CardDescription>
                    Switch minimalista sem usar componente Button do shadcn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CompactDarkModeSwitch />
                    <span className="text-sm text-muted-foreground">
                      Ultra compacto
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Toggle Switch */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Toggle Switch</CardTitle>
                  <CardDescription>
                    Switch estilo toggle com ícones nas laterais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DarkModeToggleSwitch />
                    <span className="text-sm text-muted-foreground">
                      Toggle completo
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Dropdown Avançado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dropdown Completo</CardTitle>
                  <CardDescription>
                    Dropdown com opções Light, Dark e System
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <span className="text-sm text-muted-foreground">
                      Com dropdown
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Toggle Simples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Toggle Simples</CardTitle>
                  <CardDescription>
                    Toggle que alterna apenas entre light e dark
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <SimpleThemeToggle />
                    <span className="text-sm text-muted-foreground">
                      Só light/dark
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Tamanhos Diferentes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tamanhos Diferentes</CardTitle>
                  <CardDescription>
                    O mesmo botão em diferentes tamanhos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch size="sm" />
                    <span className="text-sm text-muted-foreground">Small</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch size="icon" />
                    <span className="text-sm text-muted-foreground">
                      Icon (padrão)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch size="lg" />
                    <span className="text-sm text-muted-foreground">Large</span>
                  </div>
                </CardContent>
              </Card>

              {/* Customizado */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customizado</CardTitle>
                  <CardDescription>
                    Exemplos com classes CSS customizadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      Azul personalizado
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <DarkModeSwitch className="rounded-full" />
                    <span className="text-sm text-muted-foreground">
                      Circular
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="headers" className="space-y-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Headers com Switch Integrado
                  </CardTitle>
                  <CardDescription>
                    Diferentes estilos de header já com o switch integrado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Header Dropdown */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Header com Dropdown
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <DashboardHeader
                        title="Meu Dashboard"
                        subtitle="Com dropdown completo"
                        switchType="dropdown"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Header Simples */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Header com Botão Simples
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <DashboardHeader
                        title="Meu Dashboard"
                        subtitle="Com botão simples"
                        switchType="simple"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Header Compacto */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Header com Botão Compacto
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <DashboardHeader
                        title="Meu Dashboard"
                        subtitle="Com botão compacto"
                        switchType="compact"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Header com Texto */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Header com Texto
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <DashboardHeader
                        title="Meu Dashboard"
                        subtitle="Com botão e texto"
                        switchType="withText"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Header Simples */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Header Card Style
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <SimpleDashboardHeader title="Dashboard Card" />
                    </div>
                  </div>

                  <Separator />

                  {/* Header Minimal */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Header Minimal</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <MinimalDashboardHeader title="Dashboard Minimal" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="code" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Como Usar os Botões
                  </CardTitle>
                  <CardDescription>
                    Exemplos de código para cada tipo de botão
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Botão Básico */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      1. Botão Básico (Mais Usado)
                    </h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`import { DarkModeSwitch } from '@/components/dark-mode-switch'

// Uso simples
<DarkModeSwitch />

// Com variantes
<DarkModeSwitch variant="default" />
<DarkModeSwitch variant="outline" />
<DarkModeSwitch variant="ghost" />

// Com texto
<DarkModeSwitch showText size="default" />
`}</code>
                    </div>
                  </div>

                  <Separator />

                  {/* Botão com Texto */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      2. Botão com Texto
                    </h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`import { DarkModeSwitchWithText } from '@/components/dark-mode-switch'

// Sempre mostra texto
<DarkModeSwitchWithText />

// Com classe customizada
<DarkModeSwitchWithText className="w-full" />
`}</code>
                    </div>
                  </div>

                  <Separator />

                  {/* Botão Compacto */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">3. Botão Compacto</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`import { CompactDarkModeSwitch } from '@/components/dark-mode-switch'

// Ultra compacto
<CompactDarkModeSwitch />

// Com classe customizada
<CompactDarkModeSwitch className="ml-auto" />
`}</code>
                    </div>
                  </div>

                  <Separator />

                  {/* Toggle Switch */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">4. Toggle Switch</h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`import { DarkModeToggleSwitch } from '@/components/dark-mode-switch'

// Toggle com ícones
<DarkModeToggleSwitch />

// Com classe customizada
<DarkModeToggleSwitch className="justify-center" />
`}</code>
                    </div>
                  </div>

                  <Separator />

                  {/* Header */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">
                      5. Header com Switch
                    </h4>
                    <div className="bg-muted p-4 rounded-lg text-sm">
                      <code>{`import { DashboardHeader } from '@/components/dashboard-header'

// Header com dropdown
<DashboardHeader
  title="Meu App"
  subtitle="Descrição"
  switchType="dropdown"
/>

// Header com botão simples
<DashboardHeader
  title="Meu App"
  switchType="simple"
/>

// Header compacto
<DashboardHeader
  title="Meu App"
  switchType="compact"
/>
`}</code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recomendações */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Recomendações de Uso
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Badge variant="default" className="mt-1">
                        ✨
                      </Badge>
                      <div>
                        <p className="font-medium">Para Headers e Navegação</p>
                        <p className="text-sm text-muted-foreground">
                          Use <code>DarkModeSwitch</code> - É limpo e não ocupa
                          muito espaço
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="secondary" className="mt-1">
                        ⚙️
                      </Badge>
                      <div>
                        <p className="font-medium">
                          Para Páginas de Configurações
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Use <code>DarkModeSwitchWithText</code> - Deixa claro
                          qual é o modo atual
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-1">
                        🎛️
                      </Badge>
                      <div>
                        <p className="font-medium">Para Controles Avançados</p>
                        <p className="text-sm text-muted-foreground">
                          Use <code>ThemeToggle</code> - Oferece a opção
                          "System"
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Badge variant="destructive" className="mt-1">
                        🎨
                      </Badge>
                      <div>
                        <p className="font-medium">
                          Para Interface Minimalista
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Use <code>CompactDarkModeSwitch</code> - Máxima
                          simplicidade
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
