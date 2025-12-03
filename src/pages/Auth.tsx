import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, Wand2 } from "lucide-react";
import Header from "@/components/Header";

type AuthMode = "login" | "register";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [authMethod, setAuthMethod] = useState<"magic" | "password">("password");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const emailSchema = z.object({
    email: z.string()
      .email(t('auth.emailInvalid'))
      .min(1, t('auth.emailRequired')),
  });

  const passwordSchema = z.object({
    password: z.string()
      .min(8, t('auth.passwordMinLength'))
      .regex(/[A-Z]/, t('auth.passwordUppercase'))
      .regex(/[a-z]/, t('auth.passwordLowercase'))
      .regex(/[0-9]/, t('auth.passwordNumber')),
  });

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse({ email: email.trim() });

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      setLinkSent(true);
      toast({
        title: t('auth.magicLinkSent'),
        description: t('auth.magicLinkSentDesc'),
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate email
      emailSchema.parse({ email: email.trim() });
      
      // Validate password for registration
      if (authMode === "register") {
        passwordSchema.parse({ password });
        
        if (password !== confirmPassword) {
          throw new Error(t('auth.passwordsDoNotMatch'));
        }
      }

      if (authMode === "login") {
        // Login with password
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          // Handle specific error cases
          if (error.message.includes("Invalid login credentials")) {
            throw new Error(t('auth.invalidCredentials'));
          }
          throw error;
        }

        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.loginSuccess'),
        });
      } else {
        // Register with password
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            throw new Error(t('auth.emailAlreadyRegistered'));
          }
          throw error;
        }

        toast({
          title: t('auth.registrationSuccess'),
          description: t('auth.checkEmailConfirm'),
        });
        
        // Reset form after successful registration
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setLinkSent(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header user={null} isUserAdmin={false} favoritesCount={0} />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{t('auth.welcome')}</CardTitle>
          <CardDescription>
            {linkSent ? t('auth.checkEmail') : t('auth.enterEmail')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkSent ? (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('auth.magicLinkSentTo')} <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('auth.clickLinkToLogin')}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setLinkSent(false);
                  setEmail("");
                }}
              >
                {t('auth.changeEmail')}
              </Button>
            </div>
          ) : (
            <Tabs value={authMethod} onValueChange={(v) => { setAuthMethod(v as "magic" | "password"); resetForm(); }}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('auth.password')}
                </TabsTrigger>
                <TabsTrigger value="magic" className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  {t('auth.magicLink')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password">
                {/* Login/Register Toggle */}
                <div className="flex gap-2 mb-6">
                  <Button
                    type="button"
                    variant={authMode === "login" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setAuthMode("login"); resetForm(); }}
                  >
                    {t('auth.login')}
                  </Button>
                  <Button
                    type="button"
                    variant={authMode === "register" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => { setAuthMode("register"); resetForm(); }}
                  >
                    {t('auth.register')}
                  </Button>
                </div>

                <form onSubmit={handlePasswordAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-password">{t('auth.email')}</Label>
                    <Input
                      id="email-password"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete={authMode === "login" ? "current-password" : "new-password"}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {authMode === "register" && (
                      <p className="text-xs text-muted-foreground">
                        {t('auth.passwordRequirements')}
                      </p>
                    )}
                  </div>

                  {authMode === "register" && (
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('common.loading') : authMode === "login" ? t('auth.login') : t('auth.register')}
                  </Button>

                  {authMode === "login" && (
                    <p className="text-center text-sm text-muted-foreground">
                      {t('auth.forgotPassword')}{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setAuthMethod("magic")}
                      >
                        {t('auth.useMagicLink')}
                      </button>
                    </p>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="magic">
                <form onSubmit={handleSendMagicLink} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-magic">{t('auth.email')}</Label>
                    <Input
                      id="email-magic"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('auth.magicLinkHint')}
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('common.loading') : t('auth.sendMagicLink')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;
