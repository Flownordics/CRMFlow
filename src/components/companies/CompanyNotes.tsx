import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyNote, Plus, Pin, Trash2, Edit2, X, Check } from "lucide-react";
import { useCompanyNotes, useCreateCompanyNote, useUpdateCompanyNote, useDeleteCompanyNote, useToggleNotePin } from "@/services/companyNotes";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CompanyNotesProps {
  companyId: string;
}

export function CompanyNotes({ companyId }: CompanyNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { data: notes, isLoading } = useCompanyNotes(companyId);
  const createNote = useCreateCompanyNote();
  const updateNote = useUpdateCompanyNote();
  const deleteNote = useDeleteCompanyNote();
  const togglePin = useToggleNotePin();

  const handleCreateNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    try {
      await createNote.mutateAsync({
        companyId,
        content: newNoteContent,
        isPinned: false,
      });
      setNewNoteContent("");
      toast.success("Note created");
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    try {
      await updateNote.mutateAsync({
        id: noteId,
        data: { content: editingContent },
        companyId,
      });
      setEditingNoteId(null);
      setEditingContent("");
      toast.success("Note updated");
    } catch (error) {
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteId) return;

    try {
      await deleteNote.mutateAsync({ id: deleteNoteId, companyId });
      setDeleteNoteId(null);
      toast.success("Note deleted");
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleTogglePin = async (noteId: string, isPinned: boolean) => {
    try {
      await togglePin.mutateAsync({ id: noteId, isPinned, companyId });
      toast.success(isPinned ? "Note unpinned" : "Note pinned");
    } catch (error) {
      toast.error("Failed to toggle pin");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes ({notes?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Note Input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <Button
              onClick={handleCreateNote}
              disabled={createNote.isPending || !newNoteContent.trim()}
              size="sm"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </div>

          {/* Notes List */}
          {notes && notes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-md border ${
                    note.isPinned ? "border-muted-foreground/30 bg-muted/30" : "border-border"
                  }`}
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={updateNote.isPending}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingContent("");
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm flex-1 whitespace-pre-wrap">{note.content}</p>
                        {note.isPinned && (
                          <Badge variant="secondary" className="text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleTogglePin(note.id, note.isPinned)}
                            title={note.isPinned ? "Unpin" : "Pin"}
                          >
                            <Pin className={`h-3 w-3 ${note.isPinned ? "fill-current" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingContent(note.content);
                            }}
                            title="Edit"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-destructive"
                            onClick={() => setDeleteNoteId(note.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No notes yet. Add your first note above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteNoteId} onOpenChange={(open) => !open && setDeleteNoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

