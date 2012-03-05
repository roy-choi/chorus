describe("chorus.models.Workfile", function() {
    beforeEach(function() {
        this.model = fixtures.workfile({workspaceId: '10000', id: '10020'});
    });

    describe("#modifier", function() {
        it("returns a partially constructed user, based on the workfile's modifier attribute", function() {
            var modifier = this.model.modifier();
            expect(modifier.get("firstName")).toBe(this.model.get("modifiedBy").firstName);
            expect(modifier.get("lastName")).toBe(this.model.get("modifiedBy").lastName);
            expect(modifier.get("id")).toBe(this.model.get("modifiedBy").id);
        });
    });

    describe("#workspace", function() {
        it("returns a workspace", function() {
            expect(this.model.workspace()).toBeA(chorus.models.Workspace);
        });

        it("memoizes", function() {
            expect(this.model.workspace()).toBe(this.model.workspace());
        });

        context("when the workfile only has a workspaceId", function() {
            it("returns a workspace with the right id", function() {
                expect(this.model.workspace().get("id")).toBe("10000");
            });
        });

        context("when the workfile has a nested workspace hash", function() {
            beforeEach(function() {
                this.model.unset("workspaceId");
                this.model.set({ workspace: { id: "12", name: "my_workspace" } });
            });

            it("returns a workspace with that data", function() {
                expect(this.model.workspace().get("id")).toBe("12");
                expect(this.model.workspace().get("name")).toBe("my_workspace");
            });
        });
    });

    describe("#executionSchema", function() {
        context("when the workfile is not loaded", function() {
            beforeEach(function() {
                this.model.clear();
                delete this.model.loaded;
            })

            it("returns undefined", function() {
                expect(this.model.executionSchema()).toBeUndefined();
            });
        })

        context("when the workfile's workspace has a sandbox", function() {
            beforeEach(function() {
                this.model.workspace().set({
                    sandboxInfo: {
                        databaseId: "4",
                        databaseName: "db",
                        instanceId: "5",
                        instanceName: "instance",
                        sandboxId: "10001",
                        schemaId: "6",
                        schemaName: "schema"
                    }
                });
            })

            context("when the workfile has never been executed", function() {
                it("returns the sandbox's schema", function() {
                    var schema = this.model.executionSchema();
                    expect(schema.get("instanceId")).toBe('5');
                    expect(schema.get("instanceName")).toBe('instance');
                    expect(schema.get("databaseId")).toBe('4');
                    expect(schema.get("databaseName")).toBe('db');
                    expect(schema.get("id")).toBe('6');
                    expect(schema.get("name")).toBe('schema');
                });
            })

            context("when the workfile was last executed in a schema other than its sandbox's schema", function() {
                beforeEach(function() {
                    _.extend(this.model.get("executionInfo"), {
                        instanceId: '51',
                        instanceName: "ned",
                        databaseId: '52',
                        databaseName: "rob",
                        schemaId: '53',
                        schemaName: "louis"
                    });
                });

                it("returns that schema", function() {
                    var schema = this.model.executionSchema();
                    expect(schema.get("instanceId")).toBe('51');
                    expect(schema.get("instanceName")).toBe('ned');
                    expect(schema.get("databaseId")).toBe('52');
                    expect(schema.get("databaseName")).toBe('rob');
                    expect(schema.get("id")).toBe('53');
                    expect(schema.get("name")).toBe('louis');
                });
            });

            context("when the workfile was last executed in a its sandbox schema", function() {
                beforeEach(function() {
                    _.extend(this.model.get("executionInfo"), {
                        databaseId: "4",
                        databaseName: "db",
                        instanceId: "5",
                        instanceName: "instance",
                        sandboxId: "10001",
                        schemaId: "6",
                        schemaName: "schema"
                    });
                });

                it("returns the sandbox's schema", function() {
                    var schema = this.model.executionSchema();
                    expect(schema.get("instanceId")).toBe('5');
                    expect(schema.get("instanceName")).toBe('instance');
                    expect(schema.get("databaseId")).toBe('4');
                    expect(schema.get("databaseName")).toBe('db');
                    expect(schema.get("id")).toBe('6');
                    expect(schema.get("name")).toBe('schema');
                });
            })
        })

        context("when the workfile's workspace does not have a sandbox", function() {
            it("returns undefined", function() {
                expect(this.model.executionSchema()).toBeUndefined();
            });
        })
    });

    describe("#sandbox", function() {
        context("when the workfile's workspace has been fetched", function() {
            beforeEach(function() {
                spyOn(this.model, "workspace").andReturn(fixtures.workspace({
                    sandboxInfo: {
                        databaseId: 4,
                        databaseName: "db",
                        instanceId: 5,
                        instanceName: "instance",
                        sandboxId: "10001",
                        schemaId: 6,
                        schemaName: "schema"
                    }
                }))
            });

            it("returns the sandbox from the workspace", function() {
                expect(this.model.sandbox()).toBeA(chorus.models.Sandbox);
            });
        })

        context("when the workfile's workspace has not been fetched", function() {
            it("returns undefined", function() {
                expect(this.model.sandbox()).toBeFalsy();
            });
        })
    });

    describe("#lastComment", function() {
        beforeEach(function() {
            this.comment = this.model.lastComment();
            this.lastCommentJson = this.model.get('recentComments')[0];
        });

        it("has the right body", function() {
            expect(this.comment.get("body")).toBe(this.lastCommentJson.text);
        });

        it("has the right creator", function() {
            var creator = this.comment.author()
            expect(creator.get("id")).toBe(this.lastCommentJson.author.id);
            expect(creator.get("firstName")).toBe(this.lastCommentJson.author.firstName);
            expect(creator.get("lastName")).toBe(this.lastCommentJson.author.lastName);
        });

        context("when the workfile doesn't have any comments", function() {
            it("returns null", function() {
                expect(new chorus.models.Workfile().lastComment()).toBeFalsy();
            });
        });
    });

    describe("validation", function() {
        beforeEach(function() {
            spyOn(this.model, "require").andCallThrough();
        });

        it("should return a truthy value for a valid workspace", function() {
            expect(this.model.performValidation()).toBeTruthy();
        });

        it("requires fileName", function() {
            this.model.performValidation();
            expect(this.model.require).toHaveBeenCalledWith("fileName", undefined);
        });
    });

    describe("#urls", function() {
        beforeEach(function() {
            this.model = fixtures.workfile({
                id: 5,
                workspaceId: 10,
                versionInfo: {
                    versionFileId: '12345'
                },
                hasDraft: false,
                draftInfo: {
                    draftFileId: "99999"
                }
            });
        });

        it("has the right backend URL", function() {
            expect(this.model.url()).toBe("/edc/workspace/10/workfile/5");
        });

        describe("#showUrlTemplate", function() {
            context("when the workfile is the most recent version", function() {
                beforeEach(function() {
                    this.model.get('versionInfo').versionNum = 1;
                    this.model.set({ latestVersionNum: 1 })
                })

                it("does not include a version", function() {
                    expect(this.model.showUrlTemplate()).toBe("workspaces/{{workspaceId}}/workfiles/{{id}}")
                })
            })

            context("when the workfile is not the most recent version", function() {
                beforeEach(function() {
                    this.model.get("versionInfo").versionNum = 6
                    this.model.set({latestVersionNum: 9 })
                })

                it("includes a version", function() {
                    expect(this.model.showUrlTemplate()).toBe("workspaces/{{workspaceId}}/workfiles/{{id}}/versions/{{versionInfo.versionNum}}")
                })
            })
        })

        describe("#showUrlForVersion", function() {
            beforeEach(function() {
                this.model.get('versionInfo').versionNum = 1;
                this.model.set({ latestVersionNum: 5 })
            })

            it("shows the initial workfile version's url", function() {
                var otherModel = new chorus.models.Workfile({id: this.model.get("id"), workspaceId: this.model.get("workspaceId")});
                expect(otherModel.showUrlForVersion(1)).toBe(this.model.showUrl());
            })
        })

        describe("#showUrl", function() {
            context("when file is not showable", function() {
                beforeEach(function() {
                    spyOn(this.model, 'showable').andReturn(false);
                })

                it("uses downloadUrl", function() {
                    expect(this.model.showUrl()).toBe(this.model.downloadUrl());
                })
            })
        })

        it("has the right download URL", function() {
            expect(this.model.downloadUrl()).toBe("/edc/workspace/10/workfile/5/file/12345?download=true&iebuster=12345");
        });

        describe("#downloadUrl", function() {
            it("has the right download URL, even if iebuster is appended as a parameter", function() {
                expect(this.model.downloadUrl()).toContain("/edc/workspace/10/workfile/5/file/12345")
                expect(this.model.downloadUrl()).toContain("?")
                expect(this.model.downloadUrl()).toContain("download=true");
                expect(this.model.downloadUrl()).toContain("iebuster=12345");
            });
        })

        context("when the workfile is a draft", function() {
            beforeEach(function() {
                this.model.set({ hasDraft: true })
            });

            it("has the right download URL", function() {
                expect(this.model.downloadUrl()).toBe("/edc/workspace/10/workfile/5/file/99999?download=true&iebuster=12345");
            });
        })
    });

    describe("showable", function() {
        it("is true when the file is text", function() {
            spyOn(this.model, 'isText').andReturn(true);
            spyOn(this.model, 'isImage').andReturn(undefined);
            expect(this.model.showable()).toBeTruthy();
        })

        it("is true when the file is an image", function() {
            spyOn(this.model, 'isText').andReturn(undefined);
            spyOn(this.model, 'isImage').andReturn(true);
            expect(this.model.showable()).toBeTruthy();
        })

        it("is false otherwise", function() {
            spyOn(this.model, 'isText').andReturn(false);
            spyOn(this.model, 'isImage').andReturn(false);
            expect(this.model.showable()).toBeFalsy();
        })
    })

    describe("isImage", function() {
        context("when the workfile is an image", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "image/jpeg" });
            });

            it("returns true", function() {
                expect(this.model.isImage()).toBeTruthy();
            });
        });

        context("when the workfile is NOT an image", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "text/plain" });
            });

            it("returns false", function() {
                expect(this.model.isImage()).toBeFalsy();
            });
        });
    });

    describe("isSql", function() {
        it("returns true when the workfile is a sql file", function() {
            this.model.set({ fileType: 'SQL'});
            expect(this.model.isSql()).toBeTruthy();
        })

        it("returns false when the workfile is NOT a sql file", function() {
            this.model.set({ fileType: 'CSV'});
            expect(this.model.isSql()).toBeFalsy();
        })
    });

    describe("createDraft", function() {
        beforeEach(function() {
            this.workfile = fixtures.workfile();
        });
        it("sets the required attributes", function() {
            var draft = this.workfile.createDraft();
            expect(draft.get("workfileId")).toBe(this.workfile.get('id'));
            expect(draft.get("workspaceId")).toBe(this.workfile.get('workspaceId'));

            // backend expects content to be a first level property when saving, but it returns content nested elsewhere
            expect(draft.get("content")).toBe(this.workfile.content());
        });

        describe("when the draft is saved", function() {
            beforeEach(function() {
                var draft = this.workfile.createDraft();
                spyOnEvent(this.workfile, "change")
                draft.trigger("saved");
            });

            it("sets the workfile's 'hasDraft' field to true", function() {
                expect(this.workfile.get("hasDraft")).toBeTruthy();
            });

            it("sets the isDraft property on the workfile", function() {
                expect(this.workfile.isDraft).toBeTruthy();
            })

            it("does not trigger change on the workfile", function() {
                expect("change").not.toHaveBeenTriggeredOn(this.workfile);
            })
        });
    });

    describe("#allVersions", function() {
        it("sets the required attributes", function() {
            var workfileVersionSet = this.model.allVersions();
            expect(workfileVersionSet).toBeA(chorus.collections.WorkfileVersionSet);
            expect(workfileVersionSet.attributes.workspaceId).toBe(this.model.get("workspaceId"));
            expect(workfileVersionSet.attributes.workfileId).toBe(this.model.get("id"));
        });
    });

    describe("canEdit", function() {
        it("returns false when its version is not the current version", function() {
            this.model.set({latestVersionNum: 6});
            this.model.get('versionInfo').versionNum = 3
            expect(this.model.canEdit()).toBeFalsy();
        });

        it("returns true when its version is the current version", function() {
            this.model.set({latestVersionNum: 6});
            this.model.get('versionInfo').versionNum = 6
            expect(this.model.canEdit()).toBeTruthy();
        });
    });

    describe("isText", function() {
        context("when the workfile is a plain textfile", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "text/plain" });
            });

            it("returns true", function() {
                expect(this.model.isText()).toBeTruthy();
            });
        });

        context("when the workfile is an html file", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "text/html" });
            });

            it("returns true", function() {
                expect(this.model.isText()).toBeTruthy();
            });
        });

        context("when the workfile is an sql file", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "text/x-sql" });
            });

            it("returns true", function() {
                expect(this.model.isText()).toBeTruthy();
            });
        });

        context("when the workfile is NOT text", function() {
            beforeEach(function() {
                this.model.set({ mimeType: "image/jpeg" });
            });

            it("returns false", function() {
                expect(this.model.isText()).toBeFalsy();
            });
        });
    });

    describe("initializing from a WorkfileVersionSet", function() {
        beforeEach(function() {
            this.collection = new chorus.collections.WorkfileVersionSet([], {workspaceId: 1, workfileId: 2});
        });

        it("sets the workspaceId attribute on the model", function() {
            this.collection.add({versionInfo: {versionNum: 5}});

            expect(this.collection.models[0]).toBeA(chorus.models.Workfile);
            expect(this.collection.models[0].get("workspaceId")).toBe(this.collection.attributes.workspaceId);
        });
    });

    describe("#fetch", function() {
        context("when the versionNum equals the latestVersionNum", function() {
            beforeEach(function() {
                this.model.get('versionInfo').versionNum = 99
                this.model.set({ latestVersionNum: 99 });
                this.model.fetch();
            })

            it("fetches the correct url", function() {
                expect(this.server.lastFetch().url).toBe("/edc/workspace/10000/workfile/10020")
            })
        })

        context("when the versionNum is not equal to the latestVersionNum", function() {
            beforeEach(function() {
                this.model.get('versionInfo').versionNum = 88;
                this.model.set({ latestVersionNum: 99 });
                this.model.fetch();
            })

            it("fetches the correct url", function() {
                expect(this.server.lastFetch().url).toBe("/edc/workspace/10000/workfile/10020/version/88")
            })
        })
    })

    describe("#save", function() {
        context("with an old version", function() {
            beforeEach(function() {
                this.model.get('versionInfo').versionNum = 88
                this.model.set({ latestVersionNum: 99 });
                this.model.save();
            })

            it("does not save", function() {
                expect(this.server.lastUpdate()).toBeUndefined();
            })
        })

        context("with the latest version", function() {
            beforeEach(function() {
                this.model.get('versionInfo').versionNum = 99
                this.model.get('versionInfo').lastUpdatedStamp = "THEVERSIONSTAMP"
                this.model.set({ latestVersionNum: 99, lastUpdatedStamp: "THEWORKFILESTAMP"});
            })

            context("replacing the current version", function() {
                beforeEach(function() {
                    this.model.save();
                })

                it("saves to the correct url", function() {
                    expect(this.server.lastUpdate().url).toBe("/edc/workspace/10000/workfile/10020/version/99")
                });
                it("saves with the versionInfo lastUpdatedStamp", function() {
                    expect(this.server.lastUpdate().requestBody).toContain("THEVERSIONSTAMP");
                    expect(this.server.lastUpdate().requestBody).not.toContain("THEWORKFILESTAMP");
                });
            })

            context("saving as a new version", function() {
                beforeEach(function() {
                    this.model.saveAsNewVersion();
                })

                it("saves to the correct url", function() {
                    expect(this.server.lastCreate().url).toBe("/edc/workspace/10000/workfile/10020/version")
                })
            })
        })
    })

    describe("#content", function() {
        context("with an argument", function() {
            beforeEach(function() {
                spyOnEvent(this.model, "change");
                this.model.content("i am not old content")
            });

            it("sets the content", function() {
                expect(this.model.get("versionInfo").content).toBe('i am not old content');
            })

            it("triggers change", function() {
                expect("change").toHaveBeenTriggeredOn(this.model);
            });
            it("sets the content in the model", function() {
                expect(this.model.get("content")).toBe('i am not old content');
            })
        });

        context("with silent: true", function() {
            beforeEach(function() {
                spyOnEvent(this.model, "change");
                this.model.content("i am not old content", {silent: true})
            });

            it("sets the content", function() {
                expect(this.model.get("versionInfo").content).toBe('i am not old content');
            })

            it("does not trigger change", function() {
                expect("change").not.toHaveBeenTriggeredOn(this.model);
            });
            it("sets the content in the model", function() {
                expect(this.model.get("content")).toBe('i am not old content');
            })
        });

        context("without an argument", function() {
            it("returns the content", function() {
                expect(this.model.content()).toBe(this.model.get('versionInfo').content);
            })
        })
    })

    describe("#linkUrl", function() {
        beforeEach(function() {
            this.model.set({
                versionInfo: {
                    versionNum: 1,
                    versionFileId: "foo"
                },
                latestVersionNum: 2
            });
        })

        context("when the workfile is a text file", function() {
            beforeEach(function() {
                spyOn(this.model, "isText").andReturn(true);
                spyOn(this.model, "isImage").andReturn(false);
            });

            it("returns the showUrl", function() {
                expect(this.model.linkUrl()).toBe(this.model.showUrl());
            })

            it("accepts a version option", function() {
                expect(this.model.linkUrl({ version: 4 })).toBe(this.model.showUrlForVersion(4))
            })
        })

        context("when the workfile is an image file", function() {
            beforeEach(function() {
                spyOn(this.model, "isText").andReturn(false);
                spyOn(this.model, "isImage").andReturn(true);
            });

            it("returns the showUrl", function() {
                expect(this.model.linkUrl()).toBe(this.model.showUrl());
            })

            it("accepts a version option", function() {
                expect(this.model.linkUrl({ version: 4 })).toBe(this.model.showUrlForVersion(4))
            })
        })

        context("when the workfile neither a text file nor an image file", function() {
            beforeEach(function() {
                spyOn(this.model, "isText").andReturn(false);
                spyOn(this.model, "isImage").andReturn(false);
            });

            it("returns the downloadUrl", function() {
                expect(this.model.linkUrl()).toBe(this.model.downloadUrl());
            })
        })
    })

    describe("#hasOwnPage", function() {
        context("when the workfile is an image", function() {
            beforeEach(function() {
                spyOn(this.model, 'isImage').andReturn(true)
                spyOn(this.model, 'isText').andReturn(false)
            })

            it("returns true", function() {
                expect(this.model.hasOwnPage()).toBeTruthy();
            })
        })

        context("when the workfile is a text", function() {
            beforeEach(function() {
                spyOn(this.model, 'isImage').andReturn(false)
                spyOn(this.model, 'isText').andReturn(true)
            })

            it("returns true", function() {
                expect(this.model.hasOwnPage()).toBeTruthy();
            })
        })

        context("when the workfile is a neither image or text", function() {
            beforeEach(function() {
                spyOn(this.model, 'isImage').andReturn(false)
                spyOn(this.model, 'isText').andReturn(false)
            })

            it("returns false", function() {
                expect(this.model.hasOwnPage()).toBeFalsy();
            })
        })
    })

    describe("#iconUrl", function() {
        it("proxies to fileIconUrl helper", function() {
            var url = this.model.iconUrl({size: 'medium'});
            expect(url).toBe(chorus.urlHelpers.fileIconUrl(this.model.get('fileType'), 'medium'));
        })

        it("defaults to large size", function() {
            var url = this.model.iconUrl();
            expect(url).toBe(chorus.urlHelpers.fileIconUrl(this.model.get('fileType', 'large')));
        })

        it("uses type when fileType is not available", function() {
            this.model.unset("fileType");
            this.model.attributes.type = 'SQL';
            expect(this.model.iconUrl()).toBe(chorus.urlHelpers.fileIconUrl('SQL', 'large'));
        })
    });

    describe("#setWorkspace", function() {
        beforeEach(function() {
            this.newWorkspace = fixtures.workspace();
            this.model.setWorkspace(this.newWorkspace);
        });

        it("should set the workspaceId properly", function() {
            expect(this.model.get("workspaceId")).toBe(this.newWorkspace.get("id"))
        })
    })
});
