import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListPlus, Trash2, Pencil, Lock, Film, Check, X } from "lucide-react";
import { toast } from "sonner";
import { listMyLists, createList, updateList, deleteList } from "@/lib/social.functions";
import { SUBJECTS } from "@/lib/subjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/lists/")({
  component: MyListsPage,
  head: () => ({
    meta: [
      { title: "My Lists — EduFlix" },
      { name: "description", content: "Manage your curated EduFlix lists of educational films and series." },
    ],
  }),
});

function MyListsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listMyLists);
  const createFn = useServerFn(createList);
  const updateFn = useServerFn(updateList);
  const deleteFn = useServerFn(deleteList);

  const { data: lists, isLoading } = useQuery({
    queryKey: ["my-lists"],
    queryFn: () => listFn(),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          description: description.trim(),
          subject: subject || undefined,
          isPublic,
        },
      }),
    onSuccess: () => {
      resetForm();
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      toast.success("List created");
    },
    onError: (err) => toast.error((err as Error).message || "Could not create list"),
  });

  const updateMut = useMutation({
    mutationFn: (listId: string) =>
      updateFn({
        data: {
          listId,
          name: name.trim() || undefined,
          description: description.trim(),
          subject: subject || undefined,
          isPublic,
        },
      }),
    onSuccess: () => {
      resetForm();
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      queryClient.invalidateQueries({ queryKey: ["list-detail"] });
      toast.success("List updated");
    },
    onError: (err) => toast.error((err as Error).message || "Could not update list"),
  });

  const deleteMut = useMutation({
    mutationFn: (listId: string) => deleteFn({ data: { listId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      queryClient.invalidateQueries({ queryKey: ["public-lists"] });
      toast.success("List deleted");
    },
    onError: (err) => toast.error((err as Error).message || "Could not delete list"),
  });

  function resetForm() {
    setName("");
    setDescription("");
    setSubject("");
    setIsPublic(true);
  }

  function startEdit(list: NonNullable<typeof lists>[number]) {
    setEditing(list.id);
    setName(list.name);
    setDescription(list.description ?? "");
    setSubject(list.subject ?? "");
    setIsPublic(list.isPublic);
  }

  const activeLists = lists ?? [];

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curate and share collections of educational films and series.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <ListPlus className="h-4 w-4" /> New list
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new list</DialogTitle>
            </DialogHeader>
            <ListForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              subject={subject}
              setSubject={setSubject}
              isPublic={isPublic}
              setIsPublic={setIsPublic}
            />
            <Button
              className="mt-4 w-full"
              disabled={!name.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Creating…" : "Create list"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : activeLists.length === 0 ? (
        <div className="mt-16 text-center text-muted-foreground">
          <p className="text-lg font-semibold">No lists yet</p>
          <p className="mt-1 text-sm">Create your first list to start organizing titles.</p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeLists.map((list) =>
            editing === list.id ? (
              <div key={list.id} className="rounded-2xl border border-border bg-card/50 p-4">
                <ListForm
                  name={name}
                  setName={setName}
                  description={description}
                  setDescription={setDescription}
                  subject={subject}
                  setSubject={setSubject}
                  isPublic={isPublic}
                  setIsPublic={setIsPublic}
                />
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => updateMut.mutate(list.id)} disabled={updateMut.isPending}>
                    <Check className="mr-1 h-3.5 w-3.5" /> Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(null);
                      resetForm();
                    }}
                  >
                    <X className="mr-1 h-3.5 w-3.5" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={list.id}
                className="flex flex-col rounded-2xl border border-border bg-card/50 p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to="/lists/$listId"
                    params={{ listId: list.id }}
                    className="line-clamp-1 text-base font-semibold hover:text-primary"
                  >
                    {list.name}
                  </Link>
                  {!list.isPublic && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                </div>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
                  {list.description || "No description."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {list.subject && <Badge variant="secondary">{list.subject}</Badge>}
                  <span className="flex items-center gap-1">
                    <Film className="h-3 w-3" /> {list.itemCount ?? 0} titles
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" className="gap-1" onClick={() => startEdit(list)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto gap-1 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMut.mutate(list.id)}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </main>
  );
}

function ListForm({
  name,
  setName,
  description,
  setDescription,
  subject,
  setSubject,
  isPublic,
  setIsPublic,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Space documentaries" />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this list about?"
          rows={3}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Subject</label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">General / cross-topic</option>
          {SUBJECTS.map((s) => (
            <option key={s.slug} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Public list</label>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>
    </div>
  );
}
