require 'spec_helper'

describe InstancesController do
  before do
    @user = FactoryGirl.create(:user)
    log_in @user
    @instance1 = FactoryGirl.create(:instance)
    @instance2 = FactoryGirl.create(:instance)
  end

  describe "#index" do
    it_behaves_like "an action that requires authentication", :get, :index

    it "returns all instances" do
      get :index
      response.code.should == "200"
      decoded_response.length.should == 2

      decoded_response[0].name.should == @instance1.name
      decoded_response[0].host.should == @instance1.host
      decoded_response[0].port.should == @instance1.port
      decoded_response[0].id.should == @instance1.id

      decoded_response[1].name.should == @instance2.name
      decoded_response[1].host.should == @instance2.host
      decoded_response[1].port.should == @instance2.port
      decoded_response[1].id.should == @instance2.id
    end
  end

  describe "#update" do
    it_behaves_like "an action that requires authentication", :put, :update

    it "should not allow non-admin/owner do it" do
      put :update, :id => @instance1.id, :instance => {:name => "changed"}
      response.code.should == "401"
    end

    context "logged-in as admin" do
      before do
        @user.admin = true
        @user.save!
        log_in @user
      end

      it "should work" do
        put :update, :id => @instance1.id, :instance => {:name => "changed", :port => 12345, :host => "server.emc.com"}
        instance = Instance.find(@instance1.id)
        instance.host.should == "server.emc.com"
        instance.name.should == "changed"
        instance.port.should == 12345
      end
    end

    context "logged in as instance-owner" do
      before do
        @instance1.owner = @user
        @instance1.save!
      end

      it "should work" do
        put :update, :id => @instance1.id, :instance => {:name => "changed", :port => 12345, :host => "server.emc.com"}
        instance = Instance.find(@instance1.id)
        instance.host.should == "server.emc.com"
        instance.name.should == "changed"
        instance.port.should == 12345
      end
    end
  end

  describe "#create" do
    it_behaves_like "an action that requires authentication", :put, :update

    context "with valid attributes" do
      let(:valid_attributes) { Hash.new }

      before do
        instance = FactoryGirl.build(:instance, :name => "new")
        Gpdb::Instance.stub(:create_cache!).with(valid_attributes, @user).and_return { instance }
      end

      it "reports that the instance was created" do
        post :create, :instance => valid_attributes
        response.code.should == "201"
      end

      it "renders the newly created instance" do
        post :create, :instance => valid_attributes
        decoded_response.name.should == "new"
      end
    end

    context "with invalid attributes" do
      let(:invalid_attributes) { Hash.new }

      before do
        instance = FactoryGirl.build(:instance, :name => nil)
        Gpdb::Instance.stub(:create_cache!).with(invalid_attributes, @user).and_raise(ActiveRecord::RecordInvalid.new(instance))
      end

      it "responds with validation errors" do
        post :create, :instance => invalid_attributes
        response.code.should == "422"
      end
    end
  end
end