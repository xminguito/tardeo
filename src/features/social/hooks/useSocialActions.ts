import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SendMessageParams } from "../types";
import { useToast } from "@/hooks/use-toast";

export const useFollow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      { target_user_id, action }: {
        target_user_id: string;
        action: "follow" | "unfollow";
      },
    ) => {
      const { data, error } = await supabase.functions.invoke("social-follow", {
        body: { target_user_id, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      toast({
        title: action === "follow" ? "Followed" : "Unfollowed",
        description: action === "follow"
          ? "You are now following this user"
          : "You have unfollowed this user",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useFriendRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      { target_user_id, action }: {
        target_user_id: string;
        action: "request" | "accept" | "reject" | "block";
      },
    ) => {
      const { data, error } = await supabase.functions.invoke(
        "social-friend-request",
        {
          body: { target_user_id, action },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });

      const messages = {
        request: "Friend request sent",
        accept: "Friend request accepted",
        reject: "Friend request rejected",
        block: "User blocked",
      };

      toast({
        title: "Success",
        description: messages[action],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      const { data, error } = await supabase.functions.invoke(
        "social-send-message",
        {
          body: params,
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: ["messages", data.conversationId],
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMarkRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversation_id: string) => {
      const { data, error } = await supabase.functions.invoke(
        "social-mark-read",
        {
          body: { conversation_id },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
