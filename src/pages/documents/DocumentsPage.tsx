import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  Link,
  FileText,
  Image,
  File,
  Building2,
  Users,
  Handshake,
  Calendar,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocuments, useDeleteDocument, useDownloadDocument } from "@/services/documents";
import { UploadDocumentModal } from "@/components/documents/UploadDocumentModal";
import { RelateDocumentModal } from "@/components/documents/RelateDocumentModal";
import { RelationBadge } from "@/components/documents/RelationBadge";
import { EmptyState } from "@/components/EmptyState";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatBytes, formatDate } from "@/lib/utils";

export default function DocumentsPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [entityType, setEntityType] = useState<string>("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("none");
  const [mimeFilter, setMimeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [relateModalState, setRelateModalState] = useState<{
    isOpen: boolean;
    documentId: string;
  }>({ isOpen: false, documentId: "" });

  const limit = 20;
  const offset = (currentPage - 1) * limit;

  // Build filter params
  const filterParams = {
    limit,
    offset,
    q: searchTerm || undefined,
    mimeLike: mimeFilter !== "all" ? mimeFilter : undefined,
    companyId: entityType === "company" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
    dealId: entityType === "deal" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
    personId: entityType === "person" && selectedEntity && selectedEntity !== "none" ? selectedEntity : undefined,
  };

  const { data: documents, isLoading, error } = useDocuments(filterParams);
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle entity type change
  const handleEntityTypeChange = (value: string) => {
    setEntityType(value);
    setSelectedEntity("none"); // Clear selected entity when type changes
    setCurrentPage(1);
  };

  // Handle entity selection
  const handleEntitySelect = (value: string) => {
    setSelectedEntity(value);
    setCurrentPage(1);
  };

  // Handle mime filter change
  const handleMimeFilterChange = (value: string) => {
    setMimeFilter(value);
    setCurrentPage(1);
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  // Handle download
  const handleDownload = (documentId: string) => {
    downloadMutation.mutate(documentId);
  };

  // Handle delete
  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  // Handle relate
  const handleRelate = (documentId: string) => {
    setRelateModalState({ isOpen: true, documentId });
  };

  // Handle navigation to related entity
  const handleNavigateToEntity = (type: string, id: string) => {
    switch (type) {
      case "company":
        navigate(`/companies/${id}`);
        break;
      case "deal":
        navigate(`/deals/${id}`);
        break;
      case "person":
        navigate(`/people/${id}`);
        break;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Documents"
        subtitle="Upload, organize and download files."
        actions={
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Entity Type */}
            <Select value={entityType} onValueChange={handleEntityTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Entity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="deal">Deal</SelectItem>
                <SelectItem value="person">Person</SelectItem>
              </SelectContent>
            </Select>

            {/* Entity Picker - This would need to be implemented with actual data */}
            <Select value={selectedEntity} onValueChange={handleEntitySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {/* This would be populated with actual entities */}
                <SelectItem value="entity-1">Sample Entity</SelectItem>
              </SelectContent>
            </Select>

            {/* MIME Filter */}
            <Select value={mimeFilter} onValueChange={handleMimeFilterChange}>
              <SelectTrigger>
                <SelectValue placeholder="File type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="doc">Documents</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load documents
            </div>
          ) : !documents || documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No documents found"
              description="Upload your first document to get started"
              action={
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const FileIcon = getFileIcon(doc.mime_type);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <FileIcon className="w-8 h-8 text-muted-foreground" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{doc.file_name}</h3>
                          <div className="flex gap-1">
                            {doc.company && (
                              <RelationBadge
                                type="company"
                                name={doc.company.name}
                                onClick={() => handleNavigateToEntity("company", doc.company_id!)}
                              />
                            )}
                            {doc.deal && (
                              <RelationBadge
                                type="deal"
                                name={doc.deal.title}
                                onClick={() => handleNavigateToEntity("deal", doc.deal_id!)}
                              />
                            )}
                            {doc.person && (
                              <RelationBadge
                                type="person"
                                name={doc.person.full_name}
                                onClick={() => handleNavigateToEntity("person", doc.person_id!)}
                              />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatBytes(doc.size_bytes)}</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.id)}
                        disabled={downloadMutation.isPending}
                        aria-label="Download document"
                      >
                        <Download className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRelate(doc.id)}
                        aria-label="Relate document"
                      >
                        <Link className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete document"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {documents && documents.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} to {offset + documents.length} of results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={documents.length < limit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <UploadDocumentModal
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
      />

      {/* Relate Modal */}
      <RelateDocumentModal
        open={relateModalState.isOpen}
        onOpenChange={(open) => setRelateModalState({ isOpen: open, documentId: relateModalState.documentId })}
        documentId={relateModalState.documentId}
      />
    </div>
  );
}
