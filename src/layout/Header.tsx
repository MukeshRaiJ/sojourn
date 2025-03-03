"use client";

import { ThemeSwitch } from "@/theme/ThemeSwitch";
import {
  PenLine,
  Menu,
  CalendarIcon,
  Search,
  Filter,
  Plus,
  Calendar,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  selectedDate: Date | undefined;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  datesWithEntries: Date[];
  handleDateSelect: (date: Date | undefined) => void;
  clearDateFilter: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  selectedTag: string | null;
  handleExport: () => void;
  showImportDialog: () => void;
  createEntry: () => void;
}

export function Header({
  selectedDate,
  isCalendarOpen,
  setIsCalendarOpen,
  datesWithEntries,
  handleDateSelect,
  searchQuery,
  setSearchQuery,
  isFilterOpen,
  setIsFilterOpen,
  selectedTag,
  handleExport,
  showImportDialog,
  createEntry,
}: HeaderProps) {
  return (
    <div className="bg-theme-gradient text-white">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 rounded-full p-1.5">
            <PenLine className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Daily Journal</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeSwitch />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 shadow-lg border-none"
                    align="end"
                  >
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      modifiers={{
                        highlighted: datesWithEntries,
                      }}
                      modifiersClassNames={{
                        highlighted:
                          "bg-blue-100 text-blue-800 font-medium dark:bg-blue-800/50 dark:text-blue-100 font-medium",
                      }}
                      className="rounded-md"
                    />
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter by date</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="shadow-lg min-w-[180px]"
                  >
                    <DropdownMenuLabel>Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExport} className="gap-2">
                      <Download className="h-4 w-4" />
                      Export Journal
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={showImportDialog}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Import Journal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>
                <p>Menu</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Search and New Entry Section */}
      <div className="px-4 pb-4 pt-1">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
              <Search className="h-4 w-4" />
            </div>
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-white/10 border-0 text-white placeholder:text-white/60 focus-visible:ring-white/30 rounded-lg"
            />
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white",
                    (selectedTag || selectedDate) && "bg-white/20"
                  )}
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button
          onClick={createEntry}
          className="w-full h-10 gap-2 font-medium bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm rounded-lg"
        >
          <Plus className="h-4 w-4" />
          New Entry
        </Button>

        {/* Indicator for active filters */}
        {(selectedTag || selectedDate) && (
          <div className="flex items-center gap-2 mt-2 text-xs text-white/70">
            <span>Filters active:</span>
            {selectedDate && (
              <Badge
                variant="outline"
                className="px-1.5 h-5 bg-white/10 border-white/20 text-white"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {format(selectedDate, "MMM d")}
              </Badge>
            )}
            {selectedTag && (
              <Badge
                variant="outline"
                className="px-1.5 h-5 bg-white/10 border-white/20 text-white"
              >
                {selectedTag}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
