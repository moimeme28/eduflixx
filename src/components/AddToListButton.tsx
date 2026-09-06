import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Check, Loader2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { listMyLists, createList, addListItem } from "@/lib/social.functions";
import { cn } from "@/lib/utils";

export interface AddToListItem {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  poster?: string | null;
  year?: string | null;
  rating?: number | null;
}

export function AddToListButton({
  item,
  variant = "icon",
  className,
}: {
  item: AddToListItem;
  variant?: "icon" | "button";
  className?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const listFn = useServerFn(listMyLists);
  const createFn = useServerFn(createList);
  const addFn = useServerFn(addListItem);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => listFn(),
    enabled: !!user && open,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const list = await createFn({ data: { name: newName.trim(), isPublic } });
      await addFn({ data: { listId: list.id, ...item } });
      return list;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      setNewName("");
      setOpen(false);
      toast.success("Created list and added title");
    },
    onError: (err) => toast.error((err as Error).message || "Could not create list"),
  });

  const addMut = useMutation({
    mutationFn: (listId: string) => addFn({ data: { listId, ...item } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      queryClient.invalidateQueries({ queryKey: ["list-detail"] });
      setOpen(false);
      toast.success("Added to list");
    },
    onError: (err) => toast.error((err as Error).message || "Could not add to list"),
  });

  function requireAuth() {
    if (!user) {
      toast.info("Sign in to save titles to a list.");
      navigate({ to: "/auth" });
      return false;
    }
    return true;
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => requireAuth()}
        aria-label="Add to list"
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full glass text-foreground transition-colors hover:text-primary disabled:opacity-60",
          className,
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    ) : (
      <Button type="button" onClick={() => requireAuth()} className={cn("gap-2", className)}>
        <ListPlus className="h-4 w-4" /> Add to list
      </Button>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-sm font-semibold">Save to a list</p>
        {isLoading ? (
          <div className="py-4 text-center text-xs text-muted-foreground">Loading your lists…</div>
        ) : (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {lists?.length === 0 && (
              <p className="py-2 text-xs text-muted-foreground">You don’t have any lists yet.</p>
            )}
            {lists?.map((list) => {
              const adding = addMut.isPending && addMut.variables === list.id;
              return (
                <button
                  key={list.id}
                  type="button"
                  disabled={addMut.isPending}
                  onClick={() => addMut.mutate(list.id)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                >
                  <span className="line-clamp-1">{list.name}</span>
                  {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 opacity-0" />}
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Create new list</p>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name"
            className="mt-2 h-8 text-sm"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Public</span>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <Button
            size="sm"
            className="mt-2 w-full"
            disabled={!newName.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ListPlus className="h-3.5 w-3.5" />}
            Create & add
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
