require 'stale'

class GpdbDataset < Dataset
  delegate :definition, :to => :statistics
  delegate :database, :to => :schema

  unscoped_belongs_to :schema, :class_name => 'GpdbSchema'

  def data_source_account_ids
    database.data_source_account_ids
  end

  def found_in_workspace_id
    (bound_workspace_ids + schema.workspace_ids).uniq
  end

  def self.total_entries(account, schema, options = {})
    schema.dataset_count account, options
  end

  def self.visible_to(*args)
    refresh(*args)
  end

  def source_dataset_for(workspace)
    schema_id != workspace.sandbox_id
  end

  def database_name
    schema.database.name
  end

  def scoped_name
    %Q{"#{schema_name}"."#{name}"}
  end

  def can_import_into(destination)
    destination_columns = destination.column_data
    source_columns = column_data

    consistent_size = source_columns.size == destination_columns.size

    consistent_size && source_columns.all? do |source_column|
      destination_columns.find { |destination_column| source_column.match?(destination_column) }
    end
  end

  def column_type
    "GpdbDatasetColumn"
  end

  def associable?
    true
  end

  def in_workspace?(workspace)
    self.bound_workspaces.include?(workspace)
  end

  private

  def create_import_event(params, user)
    workspace = Workspace.find(params[:workspace_id])
    dst_table = workspace.sandbox.datasets.find_by_name(params[:to_table]) unless params[:new_table].to_s == "true"
    Events::WorkspaceImportCreated.by(user).add(
        :workspace => workspace,
        :source_dataset => self,
        :dataset => dst_table,
        :destination_table => params[:to_table]
    )
  end
end

