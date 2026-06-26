using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PCMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantAssignedModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AssignedModuleIds",
                table: "Tenants",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AssignedModuleIds",
                table: "Tenants");
        }
    }
}
