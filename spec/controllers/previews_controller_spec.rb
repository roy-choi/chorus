require 'spec_helper'

describe PreviewsController do
  ignore_authorization!

  let(:gpdb_table) { datasets(:table) }
  let(:gpdb_data_source) { gpdb_table.data_source }
  let(:user) { users(:the_collaborator) }
  let(:account) { gpdb_data_source.account_for_user!(user) }
  let(:check_id) { 'id-for-cancelling-previews' }
  let(:connection) { Object.new }

  before do
    log_in user
    any_instance_of(Dataset) do |dataset|
      stub(dataset).connect_as(user) { connection }
    end
  end

  describe "#create" do
    let(:attributes) { { :check_id => check_id } }
    let(:params) { attributes.merge :dataset_id => gpdb_table.to_param }

    context "when create is successful" do
      before do
        fake_result = GreenplumSqlResult.new
        mock(SqlExecutor).preview_dataset(gpdb_table, connection, check_id, user) { fake_result }
      end

      it "uses authentication" do
        mock(subject).authorize! :show_contents, gpdb_data_source
        post :create, params
      end

      it "reports that the preview was created" do
        post :create, params
        response.code.should == "201"
      end

      it "renders the preview" do
        post :create, params
        decoded_response.columns.should_not be_nil
        decoded_response.rows.should_not be_nil
      end

      generate_fixture "dataPreviewTaskResults.json" do
        post :create, params
        response.should be_success
      end
    end

    context "when there's an error'" do
      before do
        mock(SqlExecutor).preview_dataset(gpdb_table, connection, check_id, user) { raise GreenplumConnection::QueryError }
      end
      it "returns an error if the query fails" do
        post :create, params

        response.code.should == "422"
        decoded_errors.fields.query.INVALID.message.should_not be_nil
      end
    end
  end

  describe "#destroy" do
    it "cancels the data preview command" do
      mock(SqlExecutor).cancel_query(gpdb_table, connection, check_id, user)
      delete :destroy, :dataset_id => gpdb_table.to_param, :id => check_id

      response.code.should == '200'
    end
  end

  describe "#preview_sql" do
    let(:schema) { schemas(:default) }
    let(:query) { "SELECT * FROM table;" }
    let(:user) { users(:owner) }
    let(:expected_sql) { "SELECT * FROM (SELECT * FROM table) AS chorus_view;" }
    let(:params) { {:schema_id => schema.id,
                    :query => query,
                    :check_id => check_id } }
    let(:row_limit) { 200 }

    before do
      stub.proxy(ChorusConfig.instance).[](anything)
      any_instance_of(Schema) do |schema|
        stub(schema).connect_as(user) { connection }
      end
      stub(ChorusConfig.instance).[]('default_preview_row_limit') { row_limit }
    end

    it "returns the results of the sql" do
      mock(SqlExecutor).execute_sql(expected_sql, connection, schema, check_id, user, :limit => row_limit) { GreenplumSqlResult.new }

      post :preview_sql, params

      response.code.should == '200'
      decoded_response.columns.should_not be_nil
      decoded_response.rows.should_not be_nil
    end
  end
end
